import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/public-content';
export const Route = createFileRoute('/sellers')({
 head:()=>({meta:[{title:'For Sellers | ELITEOZ'},{name:'description',content:'For Sellers: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:title',content:'For Sellers | ELITEOZ'},{property:'og:description',content:'For Sellers: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=> <ContentPage slug="sellers"/>
});
