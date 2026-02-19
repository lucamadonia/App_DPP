/**
 * Master Label Page Break Calculator
 *
 * Walks sections top-to-bottom, accumulating element heights.
 * When accumulated height exceeds the page content area, starts a new page.
 * Supports mid-section splitting — individual elements are atomic.
 */

import type { LabelDesign, LabelSection } from '@/types/master-label-editor';
import { A6_HEIGHT_PX, PT_TO_PX } from '@/lib/master-label-defaults';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SectionSlice {
  sectionId: string;
  section: LabelSection;
  /** [start, end) indices within the sorted section elements */
  elementRange: [number, number];
  /** True if this slice is a continuation from a previous page */
  isPartial: boolean;
}

export interface PageContent {
  pageIndex: number;
  sections: SectionSlice[];
  usedHeight: number;
}

export interface PageBreakResult {
  pages: PageContent[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Approximate height for a section header row (label + collapse icon) */
const SECTION_HEADER_HEIGHT = 18;

/** Approximate section gap / padding between sections */
const SECTION_GAP = 9;

/** Fallback element height when measurement is unavailable */
const DEFAULT_ELEMENT_HEIGHT = 16;

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------

/**
 * Calculate page breaks for a label design.
 *
 * @param design - The label design with sections and elements.
 * @param measureFn - A function that returns the measured pixel height
 *   of an element given `(sectionId, elementIndex)`. Returns undefined
 *   if the measurement is not yet available (will use fallback).
 */
export function calculatePageBreaks(
  design: LabelDesign,
  measureFn?: (sectionId: string, elementIndex: number) => number | undefined,
): PageBreakResult {
  const padding = design.padding * PT_TO_PX;
  const pageContentHeight = A6_HEIGHT_PX - padding * 2;

  const sortedSections = [...design.sections]
    .filter(s => s.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const pages: PageContent[] = [];
  let currentPage: PageContent = { pageIndex: 0, sections: [], usedHeight: 0 };

  for (const section of sortedSections) {
    const sectionElements = design.elements
      .filter(el => el.sectionId === section.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    // If section is collapsed, it just takes header height
    if (section.collapsed) {
      const headerH = SECTION_HEADER_HEIGHT + SECTION_GAP;
      if (currentPage.usedHeight + headerH > pageContentHeight && currentPage.sections.length > 0) {
        pages.push(currentPage);
        currentPage = { pageIndex: pages.length, sections: [], usedHeight: 0 };
      }
      currentPage.sections.push({
        sectionId: section.id,
        section,
        elementRange: [0, 0],
        isPartial: false,
      });
      currentPage.usedHeight += headerH;
      continue;
    }

    // Start tracking elements for this section
    const sectionPadding = (section.paddingTop ?? 0) + (section.paddingBottom ?? 0);
    const sectionBorder = section.showBorder ? 7 : 3; // border + margin
    const sectionOverhead = SECTION_HEADER_HEIGHT + sectionPadding + sectionBorder;

    // Check if we need to start the section on a new page
    // (only if current page already has content and section header alone overflows)
    if (
      currentPage.usedHeight + sectionOverhead > pageContentHeight &&
      currentPage.sections.length > 0
    ) {
      pages.push(currentPage);
      currentPage = { pageIndex: pages.length, sections: [], usedHeight: 0 };
    }

    let elementStartIndex = 0;
    let firstSlice = true;

    while (elementStartIndex < sectionElements.length) {
      // Add section header overhead for the first slice or continuations
      const overhead = firstSlice ? sectionOverhead : SECTION_HEADER_HEIGHT + 4;

      // If adding the overhead already overflows, start a new page
      if (
        currentPage.usedHeight + overhead > pageContentHeight &&
        currentPage.sections.length > 0
      ) {
        pages.push(currentPage);
        currentPage = { pageIndex: pages.length, sections: [], usedHeight: 0 };
      }

      let availableHeight = pageContentHeight - currentPage.usedHeight - overhead;
      let accumulatedHeight = 0;
      let endIndex = elementStartIndex;

      // Walk elements until we run out of space
      for (let i = elementStartIndex; i < sectionElements.length; i++) {
        const elHeight = measureFn?.(section.id, i) ?? DEFAULT_ELEMENT_HEIGHT;
        if (accumulatedHeight + elHeight > availableHeight && i > elementStartIndex) {
          // This element doesn't fit — stop before it
          break;
        }
        // Always include at least one element per page to avoid infinite loops
        accumulatedHeight += elHeight;
        endIndex = i + 1;

        if (accumulatedHeight >= availableHeight) break;
      }

      currentPage.sections.push({
        sectionId: section.id,
        section,
        elementRange: [elementStartIndex, endIndex],
        isPartial: elementStartIndex > 0 || endIndex < sectionElements.length,
      });
      currentPage.usedHeight += overhead + accumulatedHeight;

      elementStartIndex = endIndex;
      firstSlice = false;

      // If there are more elements, push current page and start new
      if (elementStartIndex < sectionElements.length) {
        pages.push(currentPage);
        currentPage = { pageIndex: pages.length, sections: [], usedHeight: 0 };
      }
    }

    // Handle empty sections (no elements)
    if (sectionElements.length === 0) {
      currentPage.sections.push({
        sectionId: section.id,
        section,
        elementRange: [0, 0],
        isPartial: false,
      });
      currentPage.usedHeight += sectionOverhead;
    }
  }

  // Push the last page if it has content
  if (currentPage.sections.length > 0) {
    pages.push(currentPage);
  }

  // Ensure at least one page exists
  if (pages.length === 0) {
    pages.push({ pageIndex: 0, sections: [], usedHeight: 0 });
  }

  return { pages };
}
