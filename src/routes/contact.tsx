import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/public-content';
export const Route = createFileRoute('/contact')({
 head:()=>({meta:[{title:'Contact Eliteoz | ELITEOZ'},{name:'description',content:'Contact Eliteoz: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:title',content:'Contact Eliteoz | ELITEOZ'},{property:'og:description',content:'Contact Eliteoz: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=> <ContentPage slug="contact"/>
});
