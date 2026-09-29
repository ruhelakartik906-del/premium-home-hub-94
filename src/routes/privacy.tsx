import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/public-content';
export const Route = createFileRoute('/privacy')({
 head:()=>({meta:[{title:'Privacy Policy | ELITEOZ'},{name:'description',content:'Privacy Policy: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:title',content:'Privacy Policy | ELITEOZ'},{property:'og:description',content:'Privacy Policy: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=> <ContentPage slug="privacy"/>
});
