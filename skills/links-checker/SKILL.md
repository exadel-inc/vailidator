---
name: links-checker
description: If user asks to validate links process links_checker results and produce an explicit audit finding that names every broken link, including invalid HTTP/HTTPS, mailto, tel, and relative AEM links. Use whenever an audit includes link validation results.
---

# Link Checker Reporting

Use this skill after the `links_checker` tool returns its array of link results.

## Classifying invalid results

Classify each invalid result by the form of its `url` before reporting it:

- **Absolute HTTP/HTTPS URL** (`http://` or `https://`) — a genuinely broken link: the URL could not be reached or returned a non-success response.
- **`mailto:` link** — broken only when the email address is invalid. `links_checker` returns `invalid` only for invalid email syntax, so an invalid `mailto:` result always means a bad email address.
- **`tel:` link** — broken only when the phone number is invalid. `links_checker` returns `invalid` only for invalid phone syntax, so an invalid `tel:` result always means a bad phone number.
- **Relative URL** (no scheme; starts with `/`, `./`, `../`, a bare path) — a relative AEM link (internal AEM navigation). Report it as broken, but always label it as a relative AEM link.
- **Other Links** (e.g., `#`, `javascript:`) — treat as valid and exclude from reporting.

## Instructions

1. Report only invalid links. Never treat a result with `status: "valid"` as broken, and never invent URLs that are not in the `links_checker` results.
2. Preserve each invalid result's `url` exactly as returned by the tool. Do not replace it with a resolved URL, a generic label, or a shortened display value.
3. Add a validation finding that lists every broken URL, using the classification above:
   - invalid absolute HTTP/HTTPS links are listed as-is, e.g. `https://example.com/missing`;
   - invalid `mailto:` (bad email) and `tel:` (bad phone) links are listed as-is, e.g. `mailto:not-an-email`;
   - invalid relative URLs are listed with an explicit `relative AEM link` label, e.g. `Broken relative AEM link: /destinations/broken.html`.
4. Set the finding status as follows:
   - `fail` when any invalid result is an absolute HTTP/HTTPS, `mailto:`, or `tel:` link;
   - `warning` when the only invalid results are relative AEM links — they are internal links that may resolve correctly in the real AEM environment even if the check failed here;
   - `pass` when there are no invalid results.
5. Put the same explicit URL list in the recommendation so the report remains actionable. Recommend repairing or removing each named link.
6. Do not claim that all links are valid when the result array contains any invalid item.
7. Keep link validation separate from Lighthouse SEO and accessibility findings. Do not infer a broken link from markup text alone; use only the `links_checker` results.
8. You can use \n inside the `description` and `recommendation` strings to place each broken link on its own line for readability.

## Finding format

Use the audit report's existing validation shape. When there are invalid absolute HTTP/HTTPS, `mailto:`, or `tel:` links, mark the finding as `fail`:

```json
{
  "rule": "All page links should be valid",
  "status": "fail",
  "description": "Broken links: \n https://example.com/missing \n mailto:not-an-email \n",
  "recommendation": "Repair or remove these broken links: \n https://example.com/missing \n mailto:not-an-email."
}
```

When invalid relative URLs are present alongside broken links, list them with the `relative AEM link` label:

```json
{
  "rule": "All page links should be valid",
  "status": "fail",
  "description": "Broken links: \n https://example.com/missing \n Broken relative AEM links: \n /destinations/broken.html.",
  "recommendation": "Repair or remove these broken links: \n https://example.com/missing \n and verify that these relative AEM links resolve to existing pages: \n /destinations/broken.html."
}
```

When the only invalid results are relative AEM links, mark the finding as `warning`:

```json
{
  "rule": "All page links should be valid",
  "status": "warning",
  "description": "Relative AEM links could not be verified: \n /destinations/broken.html.",
  "recommendation": "Verify that these relative AEM links resolve to existing pages in the AEM environment: \n /destinations/broken.html."
}
```

For a clean result, use:

```json
{
  "rule": "All page links should be valid",
  "status": "pass",
  "description": "The link checker found no broken links.",
  "recommendation": "No link changes are required."
}
```

The final audit response must continue to follow the project's required JSON report schema. Avoid markdown, code fences, or additional prose in the generated report.
