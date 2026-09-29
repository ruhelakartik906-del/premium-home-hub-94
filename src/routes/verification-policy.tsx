import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/public-content';
export const Route = createFileRoute('/verification-policy')({
 head:()=>({meta:[{title:'Verification Policy | ELITEOZ'},{name:'description',content:'Verification Policy: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:title',content:'Verification Policy | ELITEOZ'},{property:'og:description',content:'Verification Policy: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=> <ContentPage slug="verification-policy"/>
});
