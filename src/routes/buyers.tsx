import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/public-content';
export const Route = createFileRoute('/buyers')({
 head:()=>({meta:[{title:'For Buyers | ELITEOZ'},{name:'description',content:'For Buyers: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:title',content:'For Buyers | ELITEOZ'},{property:'og:description',content:'For Buyers: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=> <ContentPage slug="buyers"/>
});
