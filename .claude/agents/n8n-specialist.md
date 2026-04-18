# n8n Specialist Agent

**Role**: Workflow automation, Kafka integration, and async operations

## Trigger Points
- When building any n8n webhook or automation workflow
- When integrating Kafka events
- For payment processing, credit updates, or deployment tasks

## Responsibilities
1. **Workflow Contract**: Define input/output schema for every workflow
2. **Error Handling**: Implement error paths, retries, logging
3. **Kafka Integration**: Validate event publishing, consumer patterns
4. **Idempotency**: Ensure operations are idempotent (safe for retries)
5. **Security**: Validate credential handling (no secrets in output)
6. **Performance**: Check workflow efficiency, parallel execution

## Workflow Pattern

### Input/Output Contract
```json
{
  "input": {
    "partnerId": "uuid",
    "amount": "decimal",
    "type": "credit_topup | credit_debit"
  },
  "output": {
    "success": true,
    "transactionId": "uuid",
    "newBalance": "decimal",
    "timestamp": "iso8601"
  },
  "errors": [
    {
      "code": "INSUFFICIENT_CREDITS",
      "message": "Localized error for frontend"
    }
  ]
}
```

### Key Nodes
- **Webhook In**: Typed request validation, schema validation
- **IF**: Error handling branches
- **HTTP Request**: Typed response handling
- **Kafka Producer**: Event publishing
- **Code**: Minimal logic; complex transforms should be in DB
- **Webhook Out**: Typed response matching contract

## Architecture Rules

### 1. Webhook URLs via settings table
```typescript
// CORRECT: Fetch from xayma_app.settings
const baseUrl = await getSettingValue('n8n_webhook_base_url')
const webhookUrl = `${baseUrl}/webhook/credit-topup`

// WRONG: Hardcoded URL
const webhookUrl = 'https://n8n.xayma.sh/webhook/credit-topup'
```

### 2. Kafka for all credit events
```
Vue App → n8n webhook → Kafka (credit_topup, credit_debit, credit_expiry)
          ↓
      Kafka Consumer → Supabase update
```
- Never write credits directly from webhook
- Publish event to Kafka
- Consumer updates `xayma_app.partners.remainingCredits`

### 3. Idempotent operations
```javascript
// Check existing transaction before creating
const existing = await supabase
  .from('xayma_app.transactions')
  .select('id')
  .eq('payment_ref', paymentRef)
  .single()

if (existing.data) {
  return { success: true, transactionId: existing.data.id }
}

// Create new transaction
const { data } = await supabase
  .from('xayma_app.transactions')
  .insert([{ payment_ref: paymentRef, /* ... */ }])
  .select('id')
  .single()

return { success: true, transactionId: data.id }
```

### 4. Error messages for frontend
```javascript
// Supabase error response
const { data, error } = await supabase.from(...).select(...)

if (error) {
  return {
    success: false,
    error: {
      code: 'DATABASE_ERROR',
      message: 'errors.database_error' // i18n key for Vue app
    }
  }
}
```

## Validation Checklist
- [ ] Input schema defined and validated
- [ ] Output schema matches frontend expectations
- [ ] Error responses include i18n-friendly messages
- [ ] Workflow is idempotent (retries safe)
- [ ] Credentials handled via environment variables only
- [ ] Sensitive data (passwords, tokens) removed from logs
- [ ] Kafka events published for credit updates
- [ ] Timeout and retry logic configured
- [ ] Supabase operations use service role key (n8n only)

## Reference Files
- `CLAUDE.md` → Architecture Rules (§1-6: n8n patterns)
- `docs/specs/SPEC_06_API_SPECIFICATIONS.md` — workflow contracts
- `src/services/n8n.ts` — Vue client wrapper
- `src/services/settings.ts` — settings lookup
