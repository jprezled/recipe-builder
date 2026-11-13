-- RB-209: remember a cook's dietary choices on their account.
--
-- Two columns rather than one, because they are two different things and the
-- API treats them differently: `diet` is exactly one value from an agreed
-- list of three, `intolerances` is a comma-separated list from an agreed six.
-- Packing both into one column would mean parsing a format we invented, on
-- every read, to recover a split Spoonacular already gives us.
--
-- Stored as the same strings the address carries (see
-- docs/dietary-filter-contract.md), so a saved preference and a filter typed
-- into the address cannot disagree about shape.
--
-- Nullable with no default: "no preference saved" is the ordinary case, and
-- the string "none" is already meaningful to the filter - it means the cook
-- actively chose no filter. Null and "none" are therefore different answers
-- and must stay distinguishable.
ALTER TABLE users
    ADD COLUMN diet TEXT,
    ADD COLUMN intolerances TEXT;
