import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for scraped URL previews (1 hour TTL)
const urlPreviewCache = new Map<string, { preview: any; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function extractMeta(html: string, nameOrProp: string): string | null {
    const escaped = nameOrProp.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex1 = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i');
    const regex2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i');
    
    const match1 = html.match(regex1);
    if (match1 && match1[1]) return decodeHtmlEntities(match1[1].trim());

    const match2 = html.match(regex2);
    if (match2 && match2[1]) return decodeHtmlEntities(match2[1].trim());

    return null;
}

function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
}

function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
    try {
        return new URL(relativeOrAbsolute, baseUrl).href;
    } catch {
        return relativeOrAbsolute;
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        let targetUrl = (body?.url || '').trim();

        if (!targetUrl) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = `https://${targetUrl}`;
        }

        // Check in-memory cache first
        const now = Date.now();
        const cached = urlPreviewCache.get(targetUrl);
        if (cached && cached.expiresAt > now) {
            return NextResponse.json({
                success: true,
                preview: cached.preview,
                fromCache: true,
            });
        }

        const parsedUrl = new URL(targetUrl);
        const hostname = parsedUrl.hostname.replace(/^www\./i, '');

        // Fetch target webpage with realistic headers and 8s timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        let html = '';
        let ok = false;

        try {
            const response = await fetch(targetUrl, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                signal: controller.signal,
            });

            ok = response.ok;
            if (ok) {
                html = await response.text();
            }
        } catch {
            ok = false;
        } finally {
            clearTimeout(timeout);
        }

        if (!ok || !html) {
            const fallbackPreview = {
                url: targetUrl,
                title: hostname,
                description: '',
                image: '',
                siteName: hostname,
                favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
                price: null,
                currency: '',
                type: 'website',
            };

            urlPreviewCache.set(targetUrl, { preview: fallbackPreview, expiresAt: now + CACHE_TTL_MS });

            return NextResponse.json({
                success: true,
                preview: fallbackPreview,
            });
        }

        // 1. Title Extraction
        let title =
            extractMeta(html, 'og:title') ||
            extractMeta(html, 'twitter:title') ||
            extractMeta(html, 'title') ||
            '';

        if (!title) {
            const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleTagMatch && titleTagMatch[1]) {
                title = decodeHtmlEntities(titleTagMatch[1].trim());
            }
        }

        // 2. Description Extraction
        let description =
            extractMeta(html, 'og:description') ||
            extractMeta(html, 'twitter:description') ||
            extractMeta(html, 'description') ||
            '';

        // 3. Image Extraction
        let image =
            extractMeta(html, 'og:image') ||
            extractMeta(html, 'og:image:secure_url') ||
            extractMeta(html, 'twitter:image') ||
            extractMeta(html, 'twitter:image:src') ||
            '';

        if (!image) {
            const imgMatch = html.match(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/i);
            if (imgMatch && imgMatch[1]) {
                image = imgMatch[1];
            }
        }

        if (image) {
            image = resolveUrl(image, targetUrl);
        }

        // 4. Site Name
        let siteName =
            extractMeta(html, 'og:site_name') ||
            extractMeta(html, 'application-name') ||
            hostname;

        // 5. Favicon
        let favicon = '';
        const iconMatch =
            html.match(/<link[^>]+rel=["'](?:shortcut icon|icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i) ||
            html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut icon|icon|apple-touch-icon)["']/i);

        if (iconMatch && iconMatch[1]) {
            favicon = resolveUrl(iconMatch[1], targetUrl);
        } else {
            favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
        }

        // 6. Page / OpenGraph Type
        let ogType = extractMeta(html, 'og:type') || 'website';

        // 7. Product Price & Currency Extraction
        let price: string | number | null =
            extractMeta(html, 'product:price:amount') ||
            extractMeta(html, 'og:price:amount') ||
            extractMeta(html, 'price') ||
            null;

        let currency =
            extractMeta(html, 'product:price:currency') ||
            extractMeta(html, 'og:price:currency') ||
            extractMeta(html, 'priceCurrency') ||
            '';

        // 8. JSON-LD / Schema.org Extraction (Rich E-commerce & Product Data)
        try {
            const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
            for (const scriptTag of jsonLdMatches) {
                const contentMatch = scriptTag.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
                if (!contentMatch || !contentMatch[1]) continue;

                const rawJson = contentMatch[1].trim();
                const data = JSON.parse(rawJson);

                const items = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];

                for (const item of items) {
                    if (
                        item['@type'] === 'Product' ||
                        item['@type'] === 'IndividualProduct' ||
                        (Array.isArray(item['@type']) && item['@type'].includes('Product'))
                    ) {
                        ogType = 'product';
                        if (!title && item.name) title = item.name;
                        if (!description && item.description) description = item.description;
                        if (!image && item.image) {
                            image = Array.isArray(item.image) ? item.image[0] : typeof item.image === 'object' ? item.image.url : item.image;
                            if (image) image = resolveUrl(image, targetUrl);
                        }

                        if (item.offers) {
                            const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                            if (offer) {
                                if (offer.price !== undefined && offer.price !== null) {
                                    price = offer.price;
                                } else if (offer.lowPrice !== undefined) {
                                    price = offer.lowPrice;
                                }
                                if (offer.priceCurrency) {
                                    currency = offer.priceCurrency;
                                }
                            }
                        }
                    }
                }
            }
        } catch {
            // Non-fatal JSON-LD parsing issue
        }

        // 9. Fallback Regex for Price if Still Undetected
        if (!price) {
            const priceTagMatch = html.match(/class=["'][^"']*(?:price|amount|offer-price|product-price)[^"']*["'][^>]*>([^<]+)<\//i);
            if (priceTagMatch && priceTagMatch[1]) {
                const cleanPrice = priceTagMatch[1].replace(/[^\d.,$€£₹৳]/g, '').trim();
                if (cleanPrice) {
                    price = cleanPrice;
                    ogType = 'product';
                }
            }
        }

        const previewResult = {
            url: targetUrl,
            title: title || hostname,
            description: description || '',
            image: image || '',
            siteName,
            favicon,
            price: price || null,
            currency: currency || '',
            type: ogType,
        };

        // Cache the scraped preview
        urlPreviewCache.set(targetUrl, { preview: previewResult, expiresAt: now + CACHE_TTL_MS });

        return NextResponse.json({
            success: true,
            preview: previewResult,
        });
    } catch (error: any) {
        console.error('URL Scraper Error:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to scrape URL' },
            { status: 500 }
        );
    }
}
