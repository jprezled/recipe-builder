-- Give the demo account a password it can actually sign in with.
--
-- V2 stored the literal text 'not-a-real-hash'. That was harmless while
-- FavoriteService used a hardcoded user id and nothing ever verified it. Once
-- RB-124 makes sign-in real, that text locks the demo account - and with it
-- every favorite saved during sprint 2, because they all belong to user 1.
--
-- The hash below was produced by the application's own PasswordHasher, not by
-- a website. Different BCrypt settings produce a hash that never verifies, and
-- that failure looks exactly like a bug in the login code.
--
-- Password: demo1234
UPDATE users
SET password_hash = '$2a$10$VQ1ZrjekUo5Eo39hQ0wRQ.4gOGJH7Pin.KTWBvzft9OOl4jI1Dm1W'
WHERE user_id = 1;
