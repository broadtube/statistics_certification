import type { APIRoute } from 'astro';
import { getSite } from '../../../site';

export const GET: APIRoute = () => new Response(JSON.stringify(getSite().problemBank.index));
