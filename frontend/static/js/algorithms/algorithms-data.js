export const quizQuestions = [
    {
        question: "In Bubble Sort, what happens when the left value is larger than the right value?",
        options: ["They swap positions", "The array resets", "The pivot moves left", "Both values disappear"],
        answer: 0
    },
    {
        question: "Which color marks a sorted block in this visualizer?",
        options: ["Pink", "Green", "Purple", "Sky blue"],
        answer: 1
    },
    {
        question: "What does Quick Sort use to split the array?",
        options: ["A pivot value", "Only the smallest value", "A memory stack block", "A random label"],
        answer: 0
    },
    {
        question: "What does the comparisons counter measure?",
        options: ["How many values were checked against each other", "How many arrays were generated", "How many labels exist", "How many pages were opened"],
        answer: 0
    },
    {
        question: "What does Merge Sort do before merging values back together?",
        options: ["Splits the array into smaller parts", "Chooses one pivot only", "Deletes duplicate values", "Searches only from left to right"],
        answer: 0
    }
];

export const algorithmChallenges = [
    {
        id: "bubble-logic",
        algorithm: "Bubble Sort",
        title: "The Neighbor Swap",
        text: "Given the array [50, 20, 40], what will be the state of the array after the very first comparison and swap?",
        options: ["[20, 50, 40]", "[50, 40, 20]", "[40, 20, 50]", "[20, 40, 50]"],
        answer: 0,
        concept: "Bubble sort always compares index 0 and 1 first. Since 50 > 20, they must swap."
    },
    {
        id: "quick-pivot",
        algorithm: "Quick Sort",
        title: "Pivot Selection",
        text: "In this visualizer, if we use the last element as a pivot for [10, 80, 30], which value becomes the pivot?",
        options: ["10", "80", "30", "Random"],
        answer: 2,
        concept: "Quick Sort partitions the array around a pivot value to divide and conquer."
    },
    {
        id: "merge-split",
        algorithm: "Merge Sort",
        title: "Divide and Conquer",
        text: "What is the first step Merge Sort takes on an array of 8 elements?",
        options: ["Sorts all 8 immediately", "Splits into two groups of 4", "Swaps the first and last", "Finds the smallest value"],
        answer: 1,
        concept: "Merge Sort is recursive; it breaks the problem down into the smallest possible pieces before sorting."
    }
];

export const algorithmIntros = {
    "Bubble Sort": "Bubble Sort compares two neighboring blocks at a time. If the left block is larger, they swap, so larger values slowly move to the end after repeated passes. It is primarily used for teaching adjacent comparisons and simple swap logic.",
    "Selection Sort": "Selection Sort looks through the unsorted part to find the smallest block. It then places that smallest value at the front of the unsorted section. This algorithm is useful when swaps are expensive because it minimizes writes.",
    "Insertion Sort": "Insertion Sort treats the left side as sorted. It picks the next block and shifts it left until it fits in the correct position. It performs well on small or nearly sorted lists, and is suitable for online insertion workflows.",
    "Quick Sort": "Quick Sort chooses a pivot block. Values smaller than the pivot move to the left, larger values stay to the right, and the same idea repeats on each side. It is known for fast in-memory sorting and helps in understanding partition-based reasoning.",
    "Merge Sort": "Merge Sort splits the array into smaller parts until each part is easy to sort. Then it merges those parts back together by repeatedly choosing the smaller front value. This is a stable sorting algorithm, often used for linked lists and external sorting."
};

export const conceptNotes = {
    "Bubble Sort": "Bubble Sort learns by local comparison: each neighbor check moves larger values closer to the end.",
    "Selection Sort": "Selection Sort repeatedly finds the smallest unsorted value and locks it into the next correct position.",
    "Insertion Sort": "Insertion Sort keeps the left side sorted and inserts each new value where it belongs.",
    "Quick Sort": "Quick Sort uses a pivot to divide the problem into smaller left and right partitions.",
    "Merge Sort": "Merge Sort divides the array into small sorted pieces, then merges those pieces back in order."
};

export const algorithmDetails = {
    "Bubble Sort": {
        time: "O(n^2)",
        space: "O(1)",
        best: "O(n) when already sorted",
        worst: "O(n^2) with reversed data",
        usage: "Teaching adjacent comparisons and simple swap logic."
    },
    "Selection Sort": {
        time: "O(n^2)",
        space: "O(1)",
        best: "O(n^2)",
        worst: "O(n^2)",
        usage: "Useful when swaps are expensive because it minimizes writes."
    },
    "Insertion Sort": {
        time: "O(n^2)",
        space: "O(1)",
        best: "O(n) on nearly sorted data",
        worst: "O(n^2) with reversed data",
        usage: "Small or nearly sorted lists, online insertion workflows."
    },
    "Quick Sort": {
        time: "O(n log n)",
        space: "O(log n)",
        best: "O(n log n) with balanced pivots",
        worst: "O(n^2) with poor pivots",
        usage: "Fast in-memory sorting and partition-based reasoning."
    },
    "Merge Sort": {
        time: "O(n log n)",
        space: "O(n)",
        best: "O(n log n)",
        worst: "O(n log n)",
        usage: "Stable sorting, linked lists, and external sorting."
    }
};

export const colors = {
    normal: 0xa855f7,
    compare: 0xec4899,
    min: 0x38bdf8,
    sorted: 0x22c55e,
    floor: 0x141421
};

export const algorithmNames = Object.keys(algorithmIntros);