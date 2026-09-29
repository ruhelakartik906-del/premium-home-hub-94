import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/public-content';
export const Route = createFileRoute('/seller-guidelines')({
 head:()=>({meta:[{title:'Seller Guidelines | ELITEOZ'},{name:'description',content:'Seller Guidelines: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:title',content:'Seller Guidelines | ELITEOZ'},{property:'og:description',content:'Seller Guidelines: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=> <ContentPage slug="seller-guidelines"/>
});
