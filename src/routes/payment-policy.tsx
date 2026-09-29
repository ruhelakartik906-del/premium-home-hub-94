import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/public-content';
export const Route = createFileRoute('/payment-policy')({
 head:()=>({meta:[{title:'Payment Policy | ELITEOZ'},{name:'description',content:'Payment Policy: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:title',content:'Payment Policy | ELITEOZ'},{property:'og:description',content:'Payment Policy: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=> <ContentPage slug="payment-policy"/>
});
