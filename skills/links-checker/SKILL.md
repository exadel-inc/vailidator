---
name: links-checker
description: If user asks to validate links process links_checker results and produce an explicit audit finding that names every broken link, including invalid HTTP/HTTPS, mailto, and tel links. Use whenever an audit includes link validation results.
---

# Link Checker Reporting

Use this skill after the `links_checker` tool returns its array of link results.

## Instructions

1. Treat every result with `status: "invalid"` as a broken link.
2. Preserve each invalid result's `url` exactly as returned by the tool. Do not replace it with a resolved URL, a generic label, or a shortened display value.
3. If one or more links are invalid, add a failed validation finding whose description explicitly lists every broken URL. The finding must make clear why the link failed when that information is available:
   - HTTP/HTTPS: the URL could not be reached or returned a non-success response.
   - `mailto:`: the email address has invalid syntax.
   - `tel:`: the phone number has invalid syntax.
4. Put the same explicit URL list in the recommendation when useful, so the report remains actionable. Recommend repairing or removing each named link.
5. Do not claim that all links are valid when the result array contains any invalid item.
6. If there are no invalid results, add a passing link-validation finding stating that no broken links were found. Do not invent URLs.
7. Keep link validation separate from Lighthouse SEO and accessibility findings. Do not infer a broken link from markup text alone; use only the `links_checker` results.
8. Always start links validation report with words 'The link checker found no broken links' if there are no invalid results, or 'The link checker found the following broken links' if there are invalid results.

## Finding format

Use the audit report's existing validation shape:

```json
{
  "rule": "All page links should be valid",
  "status": "fail",
  "description": "Broken links: https://example.com/missing, mailto:not-an-email.",
  "recommendation": "Repair or remove these broken links: https://example.com/missing, mailto:not-an-email."
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
