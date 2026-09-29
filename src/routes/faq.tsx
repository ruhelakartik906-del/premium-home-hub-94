import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/public-content';
export const Route = createFileRoute('/faq')({
 head:()=>({meta:[{title:'Frequently Asked Questions | ELITEOZ'},{name:'description',content:'Frequently Asked Questions: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:title',content:'Frequently Asked Questions | ELITEOZ'},{property:'og:description',content:'Frequently Asked Questions: learn about the verified, high-value real estate experience at Eliteoz.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=> <ContentPage slug="faq"/>
});
