# 1.0.0-rc.17.4

## Fixed

- Fixed TypeScript `exactOptionalPropertyTypes` build error in `IssueReceiptService`.
- `customerId` is now passed to the repository only when an existing saved customer was selected.
- New customers continue to be created automatically without sending an explicit `undefined` value.
