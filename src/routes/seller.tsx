import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '@/components/workspace';
export const Route=createFileRoute('/seller')({head:()=>({meta:[{title:'Seller Dashboard | ELITEOZ'},{name:'description',content:'Seller workspace preview for Eliteoz.'},{property:'og:title',content:'Seller Dashboard | ELITEOZ'},{property:'og:description',content:'Seller workspace preview for Eliteoz.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <Workspace role="seller"/>});
