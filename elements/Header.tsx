'use client';

import React from 'react';
import SocialHeader from '../ui/SocialHeader';

interface HeaderElementProps {
    currentUser?: any;
    searchQuery?: string;
    onSearchChange?: (val: string) => void;
    settings?: Record<string, any>;
    schema?: any;
    style?: React.CSSProperties;
}

export default function HeaderElement(props: HeaderElementProps) {
    return <SocialHeader {...props} />;
}
