from pathlib import Path

p=Path(__file__).resolve().parents[1]/"apps/windows/apps/desktop/renderer/src/main.tsx"
s=p.read_text(encoding="utf-8")

# Restore missing customer types required by the customer-create UI imported from 1.1.4.
s=s.replace(
    "CustomerRecord,CustomerProfile,CustomerCreateInput,DateRangeReport",
    "CustomerRecord,CustomerProfile,CustomerCreateInput,CustomerUpdateInput,CustomerDuplicateMatch,DateRangeReport",
    1,
)

# exactOptionalPropertyTypes: omit optional fields instead of explicitly passing undefined.
s=s.replace(
    'window.mkApi.customers.findDuplicates({phone:clientPhone||undefined,email:clientEmail||undefined})',
    'window.mkApi.customers.findDuplicates({...(clientPhone?{phone:clientPhone}:{}),...(clientEmail?{email:clientEmail}:{})})',
)
s=s.replace(
    'window.mkApi.customers.findDuplicates({phone:draft.phone.trim()||undefined,email:draft.email.trim()||undefined})',
    'window.mkApi.customers.findDuplicates({...(draft.phone.trim()?{phone:draft.phone.trim()}:{}),...(draft.email.trim()?{email:draft.email.trim()}:{})})',
)
s=s.replace(
    'window.mkApi.customers.findDuplicates({phone:draft.phone.trim()||undefined,email:draft.email.trim()||undefined,excludeId:profile.customer.id})',
    'window.mkApi.customers.findDuplicates({...(draft.phone.trim()?{phone:draft.phone.trim()}:{}),...(draft.email.trim()?{email:draft.email.trim()}:{}),excludeId:profile.customer.id})',
)
s=s.replace(
    'const input:ExpenseInput={expenseDate:form.expenseDate,supplierName:form.supplierName,amountAgorot,category:form.category,paymentMethod:form.paymentMethod,notes:form.notes,attachmentSourcePath:attachment||undefined};',
    'const input:ExpenseInput={expenseDate:form.expenseDate,supplierName:form.supplierName,amountAgorot,category:form.category,paymentMethod:form.paymentMethod,notes:form.notes,...(attachment?{attachmentSourcePath:attachment}:{})};',
)

p.write_text(s,encoding="utf-8")
print("Windows renderer typecheck regressions fixed")
