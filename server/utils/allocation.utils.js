/**
 * Allocate an integer total according to weights.
 *
 * Uses the largest remainder method so the final
 * allocations always add up exactly to total.
 */
export function allocateByWeight(
  items,
  total,
  getWeight
) {
  if (!items.length || total <= 0) {
    return items.map((item) => ({
      item,
      count: 0,
      percentage: 0,
    }));
  }

  const totalWeight = items.reduce(
    (sum, item) =>
      sum + Math.max(0, Number(getWeight(item)) || 0),
    0
  );


  if (totalWeight === 0) {
    return items.map((item) => ({
      item,
      count: 0,
      percentage: 0,
    }));
  }


  const raw = items.map((item) => {
    const weight =
      Math.max(
        0,
        Number(getWeight(item)) || 0
      );

    const percentage =
      (weight / totalWeight) * 100;

    const exact =
      (weight / totalWeight) * total;

    const floor =
      Math.floor(exact);

    return {
      item,
      weight,
      percentage,
      exact,
      floor,
      remainder: exact - floor,
    };
  });


  let allocated = raw.reduce(
    (sum, item) => sum + item.floor,
    0
  );


  let remaining =
    total - allocated;


  raw.sort(
    (a, b) =>
      b.remainder - a.remainder
  );


  let index = 0;

  while (remaining > 0) {
    raw[index].floor += 1;

    remaining -= 1;

    index =
      (index + 1) % raw.length;
  }


  return raw.map((item) => ({
    item: item.item,

    count: item.floor,

    percentage:
      Number(item.percentage.toFixed(2)),
  }));
}


/**
 * Allocate question types.
 */
export function allocateQuestionTypes({
  mcqCount,
  shortCount,
  longCount,
  documents,
}) {
  const mcq =
    allocateByWeight(
      documents,
      mcqCount,
      (doc) => doc.word_count
    );

  const short =
    allocateByWeight(
      documents,
      shortCount,
      (doc) => doc.word_count
    );

  const long =
    allocateByWeight(
      documents,
      longCount,
      (doc) => doc.word_count
    );


  return documents.map((doc) => {

    const mcqItem =
      mcq.find(
        (x) => x.item.id === doc.id
      );

    const shortItem =
      short.find(
        (x) => x.item.id === doc.id
      );

    const longItem =
      long.find(
        (x) => x.item.id === doc.id
      );


    return {
      documentId: doc.id,

      filename: doc.filename,

      percentage:
        mcqItem?.percentage ??
        shortItem?.percentage ??
        longItem?.percentage ??
        0,

      mcqCount:
        mcqItem?.count || 0,

      shortCount:
        shortItem?.count || 0,

      longCount:
        longItem?.count || 0,
    };
  });
}