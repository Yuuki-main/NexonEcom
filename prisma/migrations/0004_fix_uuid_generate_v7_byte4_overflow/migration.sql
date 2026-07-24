-- ============================================================================
-- Fix shared.uuid_generate_v7(): remaining integer overflow (byte 4)
-- ============================================================================
-- Migration 0003 fixed byte 5 (`v_time::int & 255`, casting the full ~1.78e12
-- ms timestamp to int4 before masking). Byte 4 has the same class of bug:
-- `(v_time >> 8)::int & 255` shifts by only 8 bits, which for any timestamp
-- after ~1987 still leaves a value above int4's ~2.147e9 max (today's
-- timestamps shift to ~6.97e9) — so the cast overflows before the mask ever
-- runs. Every byte extraction is rewritten here to mask down to 0-255 while
-- still bigint, and only then cast to int, which is safe for every byte
-- regardless of shift amount.
-- ============================================================================

CREATE OR REPLACE FUNCTION shared.uuid_generate_v7()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_time   bigint;
  v_rand_a bytea;
  v_rand_b bytea;
  v_bytes  bytea;
BEGIN
  -- Milliseconds since Unix epoch (bigint)
  v_time := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;

  -- Cryptographic randomness from pgcrypto
  v_rand_a := gen_random_bytes(2);   -- 2 bytes for rand_a portion
  v_rand_b := gen_random_bytes(8);   -- 8 bytes for rand_b portion

  -- Construct UUIDv7 as a 16-byte bytea:
  -- bytes 0-5:  48 bits of timestamp (big-endian)
  -- bytes 6-7:  version nibble (0111 = 7) + top 12 bits of v_rand_a
  -- bytes 8-9:  variant nibble (10xx) + remaining 14 bits of v_rand_a...
  -- bytes 10-15: 48 bits of v_rand_b
  v_bytes :=
    set_byte(set_byte(set_byte(set_byte(set_byte(
      set_byte('\x00000000000000000000000000000000'::bytea, 0, ((v_time >> 40) & 255)::int),
      1, ((v_time >> 32) & 255)::int),
      2, ((v_time >> 24) & 255)::int),
      3, ((v_time >> 16) & 255)::int),
      4, ((v_time >> 8) & 255)::int),
      5, (v_time & 255)::int);

  -- Byte 6: version nibble (upper 4 bits = 0111 = 7) | top 4 bits of rand_a[0]
  v_bytes := set_byte(v_bytes, 6,
    (7 << 4) | (get_byte(v_rand_a, 0) >> 4));

  -- Byte 7: bottom 4 bits of rand_a[0] << 4 | top 4 bits of rand_a[1]
  v_bytes := set_byte(v_bytes, 7,
    ((get_byte(v_rand_a, 0) & 15) << 4) | (get_byte(v_rand_a, 1) >> 4));

  -- Byte 8: variant nibble (upper 2 bits = 10) | bottom 6 bits of rand_a[1]
  v_bytes := set_byte(v_bytes, 8,
    (2 << 6) | (get_byte(v_rand_a, 1) & 63));

  -- Bytes 9-15: remaining 7 bytes of rand_b
  v_bytes := set_byte(v_bytes, 9, get_byte(v_rand_b, 0));
  v_bytes := set_byte(v_bytes, 10, get_byte(v_rand_b, 1));
  v_bytes := set_byte(v_bytes, 11, get_byte(v_rand_b, 2));
  v_bytes := set_byte(v_bytes, 12, get_byte(v_rand_b, 3));
  v_bytes := set_byte(v_bytes, 13, get_byte(v_rand_b, 4));
  v_bytes := set_byte(v_bytes, 14, get_byte(v_rand_b, 5));
  v_bytes := set_byte(v_bytes, 15, get_byte(v_rand_b, 6));

  RETURN encode(v_bytes, 'hex')::uuid;
END;
$$;
