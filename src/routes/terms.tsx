import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/public-content';
export const Route = createFileRoute('/terms')({
 head:()=>({meta:[{title:'Terms & Conditions | ELITEOZ'},{name:'description',content:'Terms & Conditions: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:title',content:'Terms & Conditions | ELITEOZ'},{property:'og:description',content:'Terms & Conditions: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=> <ContentPage slug="terms"/>
});
