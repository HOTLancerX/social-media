/**
 * plugin/social-media/ui/guestUser.ts
 *
 * Persistent client-side visitor identity generator for unauthenticated users.
 * Allows multiple distinct visitors to like, react, comment, and share without collisions.
 */

export function getGuestUser(currentUser?: { _id?: string; name?: string; image?: string } | null): { id: string; name: string; image?: string } | undefined {
    if (currentUser?._id) return undefined;
    if (typeof window === 'undefined') return { id: 'guest_visitor', name: 'Visitor' };

    let guestId = localStorage.getItem('social_guest_id');
    if (!guestId) {
        guestId = 'guest_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
        localStorage.setItem('social_guest_id', guestId);
    }

    let guestName = localStorage.getItem('social_guest_name') || 'Visitor';
    let guestImage = localStorage.getItem('social_guest_image') || '';

    return {
        id: guestId,
        name: guestName,
        image: guestImage || undefined,
    };
}
