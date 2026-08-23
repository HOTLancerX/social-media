/**
 * plugin/social-media/lib/builderData.tsx
 *
 * SERVER-ONLY. Registers server-side renderers and builder elements for Social Media.
 * Automatically discovered by hook/builderDataHooks.ts via require.context.
 */

import React from 'react';
import { registerBuilderElement } from '@/hook/builderDataHooks';
import SocialFeedsPage from '../pages/feeds';
import SinglePostPage from '../pages/single-post';
import SocialHeader from '../ui/SocialHeader';
import StoriesBar from '../ui/StoriesBar';
import PostForm from '../ui/PostForm';
import UserProfileDynamicPage from '../profile/UserProfileDynamicPage';

// 1. Register Social Feeds Element
registerBuilderElement('social-feeds', async (schema: any) => {
    return React.createElement(SocialFeedsPage, {});
}, 'social-media');

registerBuilderElement('feeds', async (schema: any) => {
    return React.createElement(SocialFeedsPage, {});
}, 'social-media');

// 2. Register Social Header Element
registerBuilderElement('social-header', async (schema: any) => {
    const s = { ...schema?.schema?.style, ...schema?.style };
    return React.createElement(SocialHeader, { settings: s });
}, 'social-media');

// 3. Register Social Stories Bar Element
registerBuilderElement('social-stories', async (schema: any) => {
    return React.createElement(StoriesBar, {});
}, 'social-media');

// 4. Register Create Post Box Element
registerBuilderElement('social-post-form', async (schema: any) => {
    return React.createElement(PostForm, {});
}, 'social-media');

// 5. Register Single Post View Element
registerBuilderElement('social-single-post', async (schema: any) => {
    return React.createElement(SinglePostPage, {});
}, 'social-media');

// 6. Register User Profile Element
registerBuilderElement('social-profile', async (schema: any) => {
    const s = { ...schema?.schema?.style, ...schema?.style };
    return React.createElement(UserProfileDynamicPage, { settings: s });
}, 'social-media');

registerBuilderElement('user-profile', async (schema: any) => {
    const s = { ...schema?.schema?.style, ...schema?.style };
    return React.createElement(UserProfileDynamicPage, { settings: s });
}, 'social-media');
