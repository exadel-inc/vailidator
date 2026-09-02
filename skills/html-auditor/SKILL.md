---
name: html-auditor
description: Audits HTML markup against user-supplied validation rules using Lighthouse and link checker results, and writes every finding with a concrete hint that tells the user exactly which element is affected and where to look. Use whenever an audit of HTML markup is requested.
---

# Markup Audit Reporting

Use this skill when you turn the Lighthouse results, `links_checker` results, and the user's validation rules into the final audit report. Broken-link findings are handled by the separate "links-checker" skill — do not repeat link validation here.

## Core rule: every problem needs a locator

The user views the rendered page, not the raw markup, so a finding must say what is wrong AND which element it is about. Never write a generic statement such as "a heading should be H1 instead of H2" — always name the exact element by quoting its visible content so the user can find it on the page.

For each failed or warning finding, make sure the description (and recommendation) points to the concrete element:

- **Headings** — quote the heading text and its tag, e.g. "The H2 'Popular Destinations' should be an H3."
- **Text content** — quote the exact text snippet that violates the rule.
- **Images and media** — give the `src` and relevant `alt`, e.g. "Image '/images/team.jpg' has empty alt text."
- **Attributes and structure** — quote the element and attribute, e.g. "The img in the 'About' section is missing width and height attributes."
- **Missing content** — state what is missing and where it was expected, e.g. "No phone number is visible in the page header."

Mention the page region (header, hero, main, footer, etc.) when it helps. If several elements fail the same rule, list each one individually — do not collapse them into "headings are out of order" without naming them.

## Text formatting

You may use `\n` inside `description` and `recommendation` strings to place each hint or point on its own line for readability. Do not use markdown, HTML tags, or code fences inside the report text.

## Pass findings

When a check passes, no locator is needed — a short statement that the check passed is sufficient.

The final response must remain a single valid JSON object matching the required report schema.
