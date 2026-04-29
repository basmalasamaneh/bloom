export function calculateStageAndProgress(ai) {
  const today = new Date();

  const stages = [
    { key: "germination", label: "Germination" },
    { key: "seedling", label: "Seedling" },
    { key: "vegetative", label: "Vegetative" },
    { key: "flowering", label: "Flowering" },
    { key: "fruiting", label: "Fruiting" },
    { key: "harvest", label: "Harvest" }
  ];

  let currentStage = "Unknown";
  let progress = 0;

  stages.forEach((s, idx) => {
    const start = new Date(ai[`${s.key}_start`]);
    const end = new Date(ai[`${s.key}_end`]);

    if (today >= start && today <= end) {
      currentStage = s.label;

      const stageDuration = end - start;
      const elapsed = today - start;

      progress = Math.min(100, Math.round((elapsed / stageDuration) * 100));
    }
  });

  return { currentStage, progress };
}
