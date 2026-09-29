import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/public-content';
export const Route = createFileRoute('/buyer-guidelines')({
 head:()=>({meta:[{title:'Buyer Guidelines | ELITEOZ'},{name:'description',content:'Buyer Guidelines: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:title',content:'Buyer Guidelines | ELITEOZ'},{property:'og:description',content:'Buyer Guidelines: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=> <ContentPage slug="buyer-guidelines"/>
});
