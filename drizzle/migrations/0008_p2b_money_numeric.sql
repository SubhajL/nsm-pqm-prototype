-- Phase 2-B: migrate the 18 arithmetic-driving money columns from
-- real() (32-bit float, ≈7 significant digits) to numeric(14,2)
-- (exact decimal, max 999,999,999,999.99 baht ≈ 1 trillion THB,
-- well past any realistic gov't project ceiling). Keeps real() for
-- SPI/CPI ratios, progress percentages, scores, temperature, AHP
-- weights, sprint velocity, areaRai — anything that is not a baht
-- value.
--
-- USING ROUND(..., 2) on the cast so existing fixture rows are
-- coerced to exactly two decimal places. Pglite supports USING in
-- ALTER COLUMN per the Postgres semantics it emulates.

ALTER TABLE projects
  ALTER COLUMN budget TYPE numeric(14,2)
  USING ROUND(budget::numeric, 2);
--> statement-breakpoint

ALTER TABLE milestones
  ALTER COLUMN amount TYPE numeric(14,2)
  USING ROUND(amount::numeric, 2);
--> statement-breakpoint

ALTER TABLE work_periods
  ALTER COLUMN amount TYPE numeric(14,2)
  USING ROUND(amount::numeric, 2);
--> statement-breakpoint

ALTER TABLE boq_items
  ALTER COLUMN unit_price TYPE numeric(14,2)
  USING ROUND(unit_price::numeric, 2);
--> statement-breakpoint
ALTER TABLE boq_items
  ALTER COLUMN total TYPE numeric(14,2)
  USING ROUND(total::numeric, 2);
--> statement-breakpoint

ALTER TABLE payment_vouchers
  ALTER COLUMN requested_amount TYPE numeric(14,2)
  USING ROUND(requested_amount::numeric, 2);
--> statement-breakpoint
ALTER TABLE payment_vouchers
  ALTER COLUMN approved_amount TYPE numeric(14,2)
  USING ROUND(approved_amount::numeric, 2);
--> statement-breakpoint

ALTER TABLE awarded_contracts
  ALTER COLUMN award_amount TYPE numeric(14,2)
  USING ROUND(award_amount::numeric, 2);
--> statement-breakpoint

ALTER TABLE contract_amendments
  ALTER COLUMN amount_delta TYPE numeric(14,2)
  USING ROUND(amount_delta::numeric, 2);
--> statement-breakpoint

ALTER TABLE procurement_packages
  ALTER COLUMN budget_ceiling TYPE numeric(14,2)
  USING ROUND(budget_ceiling::numeric, 2);
--> statement-breakpoint

ALTER TABLE change_requests
  ALTER COLUMN budget_impact TYPE numeric(14,2)
  USING ROUND(budget_impact::numeric, 2);
--> statement-breakpoint
ALTER TABLE change_requests
  ALTER COLUMN impact_budget_thb TYPE numeric(14,2)
  USING ROUND(impact_budget_thb::numeric, 2);
--> statement-breakpoint

ALTER TABLE engineering_estimates
  ALTER COLUMN estimated_total TYPE numeric(14,2)
  USING ROUND(estimated_total::numeric, 2);
--> statement-breakpoint

ALTER TABLE land_acquisition_records
  ALTER COLUMN compensation_amount TYPE numeric(14,2)
  USING ROUND(compensation_amount::numeric, 2);
--> statement-breakpoint

ALTER TABLE evm_data_points
  ALTER COLUMN pv TYPE numeric(14,2)
  USING ROUND(pv::numeric, 2);
--> statement-breakpoint
ALTER TABLE evm_data_points
  ALTER COLUMN ev TYPE numeric(14,2)
  USING ROUND(ev::numeric, 2);
--> statement-breakpoint
ALTER TABLE evm_data_points
  ALTER COLUMN ac TYPE numeric(14,2)
  USING ROUND(ac::numeric, 2);
--> statement-breakpoint
ALTER TABLE evm_data_points
  ALTER COLUMN paid_to_date TYPE numeric(14,2)
  USING ROUND(paid_to_date::numeric, 2);
