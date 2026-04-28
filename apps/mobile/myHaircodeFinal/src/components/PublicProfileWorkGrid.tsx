import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import OptimizedImage from "@/src/components/OptimizedImage";
import { Typography } from "@/src/constants/Typography";
import { primaryBlack } from "@/src/constants/Colors";
import { coerceProfessionCode } from "@/src/constants/professionCodes";
import {
  isTablet,
  responsiveBorderRadius,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { api } from "@/src/lib/apiClient";
import {
  listPublicProfileWork,
  type PublicProfileWorkRow,
} from "@/src/api/publicProfileWork";

const NUM_COLS = 2;
const GRID_MAX_W = 400;
const GRID_MAX_W_TABLET = 560;

function chunkRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

type Props = {
  profileUserId: string;
  /** When false, omit the built-in "My work" label (use when the parent already shows a section title). @default true */
  showTitle?: boolean;
  /**
   * When set (e.g. viewer’s active professional role), loads that lane’s public work only.
   * When omitted, legacy: first linked profession on the profile.
   */
  professionCode?: string | null;
  /** When parent constrains readable column width (e.g. iPad shell), grids align to this. */
  contentMaxWidth?: number;
};

/**
 * Read-only 2-column grid of public portfolio images (Get discovered), for any profile viewer.
 */
export function PublicProfileWorkGrid({
  profileUserId,
  showTitle = true,
  professionCode: professionCodeProp,
  contentMaxWidth,
}: Props) {
  const [rows, setRows] = useState<PublicProfileWorkRow[]>([]);
  const tablet = isTablet();
  const { width: windowWidth } = useWindowDimensions();
  const scrollPad = responsivePadding(24, 28);
  const gap = responsiveScale(12);
  const cap = tablet ? GRID_MAX_W_TABLET : GRID_MAX_W;

  let rowInner: number;
  if (typeof contentMaxWidth === "number" && Number.isFinite(contentMaxWidth)) {
    rowInner = Math.max(220, Math.min(cap, Math.floor(contentMaxWidth)));
  } else {
    rowInner = Math.min(cap, Math.max(120, windowWidth - scrollPad * 2));
  }
  const cell = (rowInner - gap * (NUM_COLS - 1)) / NUM_COLS;
  const pairRows = useMemo(() => chunkRows(rows, NUM_COLS), [rows]);

  useEffect(() => {
    const id = profileUserId.trim();
    if (!id) {
      setRows([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        let code =
          coerceProfessionCode(professionCodeProp ?? null) ?? null;
        if (!code) {
          const p = await api.get<{ profession_codes?: string[] }>(
            `/api/profiles/${encodeURIComponent(id)}`
          );
          if (cancelled) return;
          code =
            coerceProfessionCode(p.profession_codes?.[0] ?? null) ?? "hair";
        }
        const list = await listPublicProfileWork(id, code);
        if (cancelled) return;
        setRows(list.slice(0, 6));
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileUserId, professionCodeProp]);

  if (rows.length === 0) return null;

  return (
    <View style={[styles.wrap, { maxWidth: rowInner }]}>
      {showTitle ? (
        <Text style={[Typography.label, styles.label]}>My work</Text>
      ) : null}
      <View style={[styles.grid, { width: rowInner }]}>
        {pairRows.map((row, rowIndex) => (
          <View
            key={`pf-row-${rowIndex}-${row[0]?.id ?? ""}`}
            style={[
              styles.row,
              rowIndex < pairRows.length - 1 ? { marginBottom: gap } : null,
            ]}
          >
            {row.map((cellItem, colIndex) => {
              const path =
                (cellItem.lowResImageUrl?.trim() &&
                cellItem.lowResImageUrl.length > 0
                  ? cellItem.lowResImageUrl
                  : cellItem.imageUrl) ?? "";
              return (
                <View
                  key={cellItem.id}
                  style={[
                    styles.thumbWrap,
                    {
                      width: cell,
                      height: cell,
                      marginRight:
                        colIndex === 0 && row.length > 1 ? gap : 0,
                    },
                  ]}
                >
                  <OptimizedImage
                    path={path}
                    bucket="public_profile_work"
                    sizePreset="inspiration-grid"
                    width={Math.ceil(cell)}
                    recyclingKey={cellItem.id}
                    style={[styles.thumb, { width: cell, height: cell }]}
                    contentFit="cover"
                    priority="low"
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignSelf: "center",
    marginBottom: responsiveMargin(16),
  },
  label: {
    color: primaryBlack,
    marginBottom: responsiveMargin(10),
    alignSelf: "flex-start",
  },
  grid: { marginBottom: responsiveMargin(4) },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
  },
  thumbWrap: {
    borderRadius: responsiveBorderRadius(18),
    overflow: "hidden",
  },
  thumb: {
    borderRadius: responsiveBorderRadius(18),
  },
});
