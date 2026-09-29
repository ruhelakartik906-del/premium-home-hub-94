import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/public-content';
export const Route = createFileRoute('/about')({
 head:()=>({meta:[{title:'About Eliteoz | ELITEOZ'},{name:'description',content:'About Eliteoz: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:title',content:'About Eliteoz | ELITEOZ'},{property:'og:description',content:'About Eliteoz: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=> <ContentPage slug="about"/>
});
