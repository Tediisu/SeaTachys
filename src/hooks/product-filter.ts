import { useState } from 'react';
import { mockProducts } from '@/constants/mock-data';

export function useProductFilter() {
    const [selectedCategory, setSelectedCategory ] = useState('All');

    const filteredProducts = selectedCategory === 'All'
        ? mockProducts
        : mockProducts.filter((p) => p.category === selectedCategory);

    return {
        selectedCategory,
        setSelectedCategory,
        filteredProducts,
    };
}
