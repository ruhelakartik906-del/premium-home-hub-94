import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/public-content';
export const Route = createFileRoute('/how-it-works')({
 head:()=>({meta:[{title:'How Eliteoz Works | ELITEOZ'},{name:'description',content:'How Eliteoz Works: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:title',content:'How Eliteoz Works | ELITEOZ'},{property:'og:description',content:'How Eliteoz Works: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=> <ContentPage slug="how-it-works"/>
});
