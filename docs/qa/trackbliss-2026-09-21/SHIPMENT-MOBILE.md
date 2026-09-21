# Shipment mobile follow-up

The previous route smoke checks did not exercise rotation or wizard navigation.
This follow-up fixes the reported clipped shipment list, hidden Continue action,
and lost form input.

- Keep both routed-content wrappers stable across the 768px breakpoint.
- Animate incoming routes only. An exiting live Outlet could briefly render a
  new form and discard early input when the transition completed.
- Portal the mobile action bar outside transformed ancestors and position the
  shipment actions above the bottom navigation, including safe-area clearance.
- Wrap shipment numbers, company names, KPI labels and status filters. Constrain
  date filters and product/batch/location selectors to the available width.
- Make Create Shipment reachable in the header and translate Continue/Confirm.

Regression coverage: `e2e/shipment-mobile.spec.ts` uses isolated synthetic API
fixtures, normal motion, 320/360/390px list widths and repeated 390x844 to
844x390 rotation. It enters recipient/address data, selects product/batch/location,
then advances through all four steps without creating a real shipment. The test
checks preserved input, visible/tappable actions and clipped card descendants.

This is browser-emulated WebKit evidence; physical-device acceptance and real
carrier operations are separate. No production shipment data was modified.
