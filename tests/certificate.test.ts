import assert from "node:assert/strict";
import test from "node:test";
import {
  certificateUsesLongStandingWording,
  certificateYearLabel,
  getCertificateVariant,
  normalizeCertificateYears,
} from "../src/certificate-logic.ts";

test("selects the correct certificate template at every wording boundary", () => {
  assert.equal(getCertificateVariant(1), "one-year");
  assert.equal(getCertificateVariant(2), "short");
  assert.equal(getCertificateVariant(3), "short");
  assert.equal(getCertificateVariant(4), "long-one-digit");
  assert.equal(getCertificateVariant(9), "long-one-digit");
  assert.equal(getCertificateVariant(10), "long-two-digits");
  assert.equal(getCertificateVariant(99), "long-two-digits");
});

test("uses singular only for one year and long-standing wording from four years", () => {
  assert.equal(certificateYearLabel(1), "Jahr");
  assert.equal(certificateYearLabel(2), "Jahre");
  assert.equal(certificateUsesLongStandingWording(3), false);
  assert.equal(certificateUsesLongStandingWording(4), true);
});

test("keeps the supported year range between one and 99", () => {
  assert.equal(normalizeCertificateYears(0), 1);
  assert.equal(normalizeCertificateYears(4.9), 4);
  assert.equal(normalizeCertificateYears(100), 99);
});
