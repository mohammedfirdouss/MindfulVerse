// Home's lead card (web: apps/web/src/pages/Home.tsx): the surah journal comes
// first. Continue the surah in progress, begin the surah your circle is
// reading (at this week's verses when it has them), or begin with a short one.
import type { SurahMeta } from "@mindfulverse/core/types";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { Pressable, View } from "react-native";

import { fonts } from "../../theme";
import { AdireCloth, Button, Text, useOnCloth } from "../../ui";
import { FadeRise } from "../../ui/FadeRise";
import { fittingVerse } from "../Circles/circleModel";
import { surahPageLabel } from "../Tadabbur/intention";
import {
  BEGIN_LINE,
  BEGIN_TITLE,
  CIRCLE_EYEBROW,
  CONTINUE_EYEBROW,
  continueTitle,
  namedAction,
  namedEyebrow,
  namedLine,
  RESUME_ACTION,
  starterLabel,
  surahName,
  whereYouAre,
  yourCircleLink,
} from "./leadModel";
import type { Lead } from "./leadModel";

const surahHref = (surah: number, ayah?: number): Href => ({
  params:
    ayah === undefined
      ? { surah: String(surah) }
      : { surah: String(surah), v: String(ayah) },
  pathname: "/tadabbur/[surah]",
});

export function SurahLead({
  lead,
  surahs,
  surahNames,
  joinedCount,
  reduce,
}: {
  lead: Lead;
  surahs: Map<number, SurahMeta>;
  surahNames: Map<number, string>;
  /** How many circles this device is in, for "Your circle(s)". */
  joinedCount: number;
  reduce: boolean;
}) {
  return (
    <FadeRise reduce={reduce} style={{ marginTop: 6 }}>
      <AdireCloth style={{ paddingHorizontal: 20, paddingVertical: 18 }}>
        <View style={{ alignItems: "flex-start", gap: 14 }}>
          <LeadBody
            lead={lead}
            surahs={surahs}
            surahNames={surahNames}
            joinedCount={joinedCount}
          />
        </View>
      </AdireCloth>
    </FadeRise>
  );
}

function LeadBody({
  lead,
  surahs,
  surahNames,
  joinedCount,
}: {
  lead: Lead;
  surahs: Map<number, SurahMeta>;
  surahNames: Map<number, string>;
  joinedCount: number;
}) {
  const cloth = useOnCloth();
  if (lead.kind === "continue") {
    return (
      <>
        <View style={{ gap: 4 }}>
          <Eyebrow>{CONTINUE_EYEBROW}</Eyebrow>
          <Text variant="h2" style={{ color: cloth.strong }}>
            {continueTitle(lead.surah, surahNames)}
          </Text>
        </View>
        <LeadLine>{whereYouAre(lead.ayah, surahs.get(lead.surah))}</LeadLine>
        <Button
          kind="cloth"
          title={RESUME_ACTION}
          onPress={() => router.push(surahHref(lead.surah, lead.ayah))}
        />
        <QuietLink
          title={surahPageLabel(surahName(lead.surah, surahs))}
          href={{
            params: { surah: String(lead.surah) },
            pathname: "/tadabbur/journal/[surah]",
          }}
        />
      </>
    );
  }
  if (lead.kind === "named") {
    const name = surahName(lead.surah, surahs);
    const verse = fittingVerse(lead.verse, surahs.get(lead.surah)?.ayahCount);
    return (
      <>
        <View style={{ gap: 4 }}>
          <Eyebrow>{namedEyebrow(lead.name)}</Eyebrow>
          <Text variant="h2" style={{ color: cloth.strong }}>
            {name}
          </Text>
        </View>
        <LeadLine>{namedLine(verse, lead.verseEnd)}</LeadLine>
        <Button
          kind="cloth"
          title={namedAction(name, verse)}
          onPress={() => router.push(surahHref(lead.surah, verse ?? undefined))}
        />
        <View>
          <QuietLink title="Choose another surah" href="/tadabbur" />
          <QuietLink title={yourCircleLink(joinedCount)} href="/circles" />
        </View>
      </>
    );
  }
  if (lead.kind === "circle") {
    const name = surahName(lead.surah, surahs);
    return (
      <>
        <View style={{ gap: 4 }}>
          <Eyebrow>{CIRCLE_EYEBROW}</Eyebrow>
          <Text variant="h2" style={{ color: cloth.strong }}>
            {name}
          </Text>
        </View>
        <LeadLine>{BEGIN_LINE}</LeadLine>
        <Button
          kind="cloth"
          title={`Begin ${name}`}
          onPress={() => router.push(surahHref(lead.surah))}
        />
        <QuietLink title="Choose another surah" href="/tadabbur" />
      </>
    );
  }
  return (
    <>
      <Text variant="h2" style={{ color: cloth.strong }}>
        {BEGIN_TITLE}
      </Text>
      <LeadLine>{BEGIN_LINE}</LeadLine>
      <View
        accessibilityLabel="Short surahs"
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
      >
        {lead.surahs.map((n) => (
          <Button
            key={n}
            kind="clothQuiet"
            title={starterLabel(n, surahs)}
            onPress={() => router.push(surahHref(n))}
          />
        ))}
      </View>
      <QuietLink title="Choose another surah" href="/tadabbur" />
    </>
  );
}

function Eyebrow({ children }: { children: string }) {
  const cloth = useOnCloth();
  return (
    <Text
      style={{
        color: cloth.soft,
        fontFamily: fonts.readMedium,
        fontSize: 14.5,
        lineHeight: 20,
      }}
    >
      {children}
    </Text>
  );
}

function LeadLine({ children }: { children: string }) {
  const cloth = useOnCloth();
  return (
    <Text style={{ color: cloth.soft, fontSize: 16.5, lineHeight: 25 }}>
      {children}
    </Text>
  );
}

function QuietLink({ title, href }: { title: string; href: Href }) {
  const cloth = useOnCloth();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(href)}
      style={{ justifyContent: "center", minHeight: 44 }}
    >
      {({ pressed }) => (
        <Text
          style={{
            color: cloth.soft,
            fontFamily: fonts.read,
            fontSize: 16,
            lineHeight: 22,
            opacity: pressed ? 0.7 : 1,
            textDecorationLine: "underline",
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
