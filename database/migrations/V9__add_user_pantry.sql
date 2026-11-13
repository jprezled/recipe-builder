-- RB-208: keep the pantry a cook typed on the sign-up form, instead of
-- losing it the moment they create an account.
--
-- A migration of its own rather than an edit to V1. V1 has already run on
-- every database that exists, so adding a column to it reaches nobody who is
-- already set up - it only helps someone installing from scratch, and leaves
-- everyone else with an app that selects a column they do not have.
--
-- IF NOT EXISTS because by now the column may have arrived three different
-- ways: sprint 4's V5, the edit to V1 that this migration replaces, or a
-- fresh run of this file. These migrations are applied by hand and nothing
-- records which have run, so re-running one has to be harmless.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS pantry VARCHAR(255);
