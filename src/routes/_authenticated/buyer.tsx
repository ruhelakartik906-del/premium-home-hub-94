import { createFileRoute, Outlet } from '@tanstack/react-router';
import { guardWorkspace } from '@/lib/access';
export const Route=createFileRoute('/_authenticated/buyer')({beforeLoad:()=>guardWorkspace('buyer'),component:()=> <Outlet/>});
