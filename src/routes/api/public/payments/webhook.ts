import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhook, EventName, type PaddleEnv } from '@/lib/paddle.server';

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

async function resolvePlanId(priceExternalId: string): Promise<string | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from('plans')
    .select('id')
    .or(`paddle_monthly_price_id.eq.${priceExternalId},paddle_annual_price_id.eq.${priceExternalId}`)
    .limit(1)
    .maybeSingle();
  return (data as any)?.id ?? null;
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;
  const userId = customData?.userId as string | undefined;
  const organizationId = customData?.organizationId as string | undefined;
  if (!organizationId) {
    console.error('paddle webhook: missing organizationId in customData');
    return;
  }
  const item = items[0];
  const priceExternalId = item?.price?.importMeta?.externalId as string | undefined;
  if (!priceExternalId) {
    console.warn('paddle webhook: missing importMeta.externalId on price');
    return;
  }
  const planId = await resolvePlanId(priceExternalId);
  const billingCycle = item?.price?.billingCycle?.interval === 'year' ? 'annual' : 'monthly';
  const amount = Number(item?.price?.unitPrice?.amount ?? 0) / 100;

  await getSupabase().from('subscriptions').upsert({
    organization_id: organizationId,
    user_id: userId ?? null,
    plan_id: planId,
    paddle_subscription_id: id,
    paddle_customer_id: customerId,
    paddle_price_id: priceExternalId,
    status,
    billing_cycle: billingCycle,
    amount,
    renewal_at: currentBillingPeriod?.endsAt,
    start_at: currentBillingPeriod?.startsAt,
    end_at: currentBillingPeriod?.endsAt,
    payment_status: 'paid',
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'paddle_subscription_id' });
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange } = data;
  await getSupabase()
    .from('subscriptions')
    .update({
      status,
      renewal_at: currentBillingPeriod?.endsAt,
      end_at: currentBillingPeriod?.endsAt,
      cancel_at_period_end: scheduledChange?.action === 'cancel',
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', id)
    .eq('environment', env);
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  await getSupabase()
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('paddle_subscription_id', data.id)
    .eq('environment', env);
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    default:
      console.log('paddle webhook unhandled:', event.eventType);
  }
}

export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error('paddle webhook error:', e);
          return new Response('Webhook error', { status: 400 });
        }
      },
    },
  },
});
