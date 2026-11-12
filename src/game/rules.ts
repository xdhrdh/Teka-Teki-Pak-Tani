export type ItemType = 'cabbage' | 'wolf' | 'goat';
export type BankSide = 'left' | 'right';
export type ConflictType = 'none' | 'wolf_eats_goat' | 'goat_eats_cabbage';
export type LightingMode = 'day' | 'dusk' | 'night';

export interface ItemMetadata {
  id: ItemType;
  number: number;
  name: string;
  shortName: string;
  keyHint: string;
  description: string;
  accentHex: string;
}

export const ITEMS_META: Record<ItemType, ItemMetadata> = {
  cabbage: {
    id: 'cabbage',
    number: 1,
    name: '1. Sayur-Sayuran',
    shortName: 'Sayur-Sayuran',
    keyHint: '1',
    description: 'Keranjang sayur-sayuran segar milik Pak Tani',
    accentHex: '#16a34a',
  },
  wolf: {
    id: 'wolf',
    number: 2,
    name: '2. Serigala',
    shortName: 'Serigala',
    keyHint: '2',
    description: 'Serigala abu-abu yang mengincar kambing',
    accentHex: '#475569',
  },
  goat: {
    id: 'goat',
    number: 3,
    name: '3. Kambing',
    shortName: 'Kambing',
    keyHint: '3',
    description: 'Kambing putih lucu yang suka makan sayur-sayuran',
    accentHex: '#d97706',
  },
};

export const ITEM_ORDER: ItemType[] = ['cabbage', 'wolf', 'goat'];

export interface MoveLogEntry {
  step: number;
  from: BankSide;
  to: BankSide;
  passenger: ItemType | null;
  text: string;
}

export interface MoveSnapshot {
  leftBank: ItemType[];
  rightBank: ItemType[];
  boatPassenger: ItemType | null;
  boatSide: BankSide;
  moves: number;
  moveLog: MoveLogEntry[];
}

export interface GameState {
  leftBank: ItemType[];
  rightBank: ItemType[];
  boatPassenger: ItemType | null;
  boatSide: BankSide;
  moves: number;
  history: MoveSnapshot[];
  moveLog: MoveLogEntry[];
  conflict: ConflictType;
  conflictBank: BankSide | null;
  isVictory: boolean;
}

export interface DemoStep {
  stepNumber: number;
  loadItem: ItemType | null;
  title: string;
  narration: string;
}

export const DEMO_STEPS: DemoStep[] = [
  {
    stepNumber: 1,
    loadItem: 'goat',
    title: 'Langkah 1 dari 7: Bawa Kambing ke Seberang',
    narration:
      'Kambing adalah kunci masalah karena ia bisa dimakan Serigala dan juga suka memakan Sayur-Sayuran. Jika kita membawa Kambing dulu, Serigala dan Sayur-Sayuran aman ditinggal berdua di Tepi Awal!',
  },
  {
    stepNumber: 2,
    loadItem: null,
    title: 'Langkah 2 dari 7: Pak Tani Kembali Sendirian',
    narration:
      'Kambing sudah aman di Seberang Rumah. Sekarang Pak Tani mendayung perahu kosong kembali ke Tepi Awal untuk menjemput barang berikutnya.',
  },
  {
    stepNumber: 3,
    loadItem: 'wolf',
    title: 'Langkah 3 dari 7: Bawa Serigala ke Seberang',
    narration:
      'Kita angkut Serigala (atau Sayur-Sayuran) ke Seberang Rumah. Di Tepi Awal kini hanya tersisa Sayur-Sayuran sendirian, jadi sangat aman.',
  },
  {
    stepNumber: 4,
    loadItem: 'goat',
    title: 'Langkah 4 dari 7: Trik Rahasia! Bawa Kambing Balik ke Tepi Awal',
    narration:
      'Nah, ini trik logika paling penting! Kita tidak boleh meninggalkan Serigala dan Kambing berdua di Seberang. Jadi Pak Tani membawa Kambing balik lagi ke Tepi Awal!',
  },
  {
    stepNumber: 5,
    loadItem: 'cabbage',
    title: 'Langkah 5 dari 7: Turunkan Kambing & Bawa Sayur-Sayuran ke Seberang',
    narration:
      'Kambing diturunkan di Tepi Awal, lalu Pak Tani membawa Sayur-Sayuran menyeberang. Di Seberang Rumah, Serigala dan Sayur-Sayuran aman ditinggal berdua karena Serigala tidak makan sayur!',
  },
  {
    stepNumber: 6,
    loadItem: null,
    title: 'Langkah 6 dari 7: Pak Tani Kembali Menjemput Kambing',
    narration:
      'Serigala dan Sayur-Sayuran sudah duduk tenang di dekat rumah Pak Tani. Sekarang Pak Tani kembali sendirian ke Tepi Awal untuk terakhir kalinya.',
  },
  {
    stepNumber: 7,
    loadItem: 'goat',
    title: 'Langkah 7 dari 7: Bawa Kambing ke Seberang — Selesai!',
    narration:
      'Terakhir, Pak Tani membawa Kambing menyeberang ke Rumah! Semua selamat dalam 7 langkah optimal!',
  },
];

function sortItems(items: ItemType[]): ItemType[] {
  return [...items].sort((a, b) => ITEMS_META[a].number - ITEMS_META[b].number);
}

export function createInitialState(): GameState {
  return {
    leftBank: ['cabbage', 'wolf', 'goat'],
    rightBank: [],
    boatPassenger: null,
    boatSide: 'left',
    moves: 0,
    history: [],
    moveLog: [],
    conflict: 'none',
    conflictBank: null,
    isVictory: false,
  };
}

export function getItemLocation(
  state: GameState,
  item: ItemType,
): 'left' | 'right' | 'boat' {
  if (state.boatPassenger === item) return 'boat';
  if (state.leftBank.includes(item)) return 'left';
  return 'right';
}

export function canToggleItem(state: GameState, item: ItemType): boolean {
  if (state.conflict !== 'none' || state.isVictory) return false;
  const loc = getItemLocation(state, item);
  return loc === 'boat' || loc === state.boatSide;
}

/**
 * Loads an item from the current bank into the boat, or unloads it back to the current bank.
 * If another item is already in the boat, it swaps them cleanly onto the current bank.
 */
export function toggleLoadItem(state: GameState, item: ItemType): GameState {
  if (!canToggleItem(state, item)) return state;

  const currentBankItems =
    state.boatSide === 'left' ? [...state.leftBank] : [...state.rightBank];

  let nextBankItems = currentBankItems;
  let nextPassenger: ItemType | null = state.boatPassenger;

  if (state.boatPassenger === item) {
    // Unload from boat to current bank
    nextPassenger = null;
    nextBankItems = sortItems([...currentBankItems, item]);
  } else {
    // Item is on current bank; move into boat (and return existing passenger if any)
    const filteredBank = currentBankItems.filter((i) => i !== item);
    if (state.boatPassenger !== null) {
      filteredBank.push(state.boatPassenger);
    }
    nextBankItems = sortItems(filteredBank);
    nextPassenger = item;
  }

  return {
    ...state,
    leftBank: state.boatSide === 'left' ? nextBankItems : state.leftBank,
    rightBank: state.boatSide === 'right' ? nextBankItems : state.rightBank,
    boatPassenger: nextPassenger,
  };
}

/**
 * Detects if the bank without Pak Tani has an invalid combination.
 * Priority: wolf_eats_goat first, then goat_eats_cabbage.
 */
export function detectBankConflict(bankItems: ItemType[]): ConflictType {
  const hasWolf = bankItems.includes('wolf');
  const hasGoat = bankItems.includes('goat');
  const hasCabbage = bankItems.includes('cabbage');

  if (hasWolf && hasGoat) {
    return 'wolf_eats_goat';
  }
  if (hasGoat && hasCabbage) {
    return 'goat_eats_cabbage';
  }
  return 'none';
}

/**
 * Rows the boat across the river to the opposite bank.
 * If the boat arrives on the Right Bank with the final 3rd item, automatically unloads it
 * to complete the puzzle and trigger Victory!
 */
export function rowBoat(state: GameState): GameState {
  if (state.conflict !== 'none' || state.isVictory) return state;

  const snapshot: MoveSnapshot = {
    leftBank: [...state.leftBank],
    rightBank: [...state.rightBank],
    boatPassenger: state.boatPassenger,
    boatSide: state.boatSide,
    moves: state.moves,
    moveLog: [...state.moveLog],
  };

  const fromSide = state.boatSide;
  const toSide: BankSide = fromSide === 'left' ? 'right' : 'left';
  const nextMoves = state.moves + 1;

  let nextLeft = [...state.leftBank];
  let nextRight = [...state.rightBank];
  let nextPassenger = state.boatPassenger;

  // Validate the bank left behind (where Pak Tani is NO LONGER present)
  const unattendedBankItems = fromSide === 'left' ? nextLeft : nextRight;
  const conflict = detectBankConflict(unattendedBankItems);
  const conflictBank = conflict !== 'none' ? fromSide : null;

  // When crossing succeeds without conflict, the passenger disembarks onto the destination bank
  if (conflict === 'none' && nextPassenger !== null) {
    if (toSide === 'right') {
      nextRight = sortItems([...nextRight, nextPassenger]);
    } else {
      nextLeft = sortItems([...nextLeft, nextPassenger]);
    }
    nextPassenger = null;
  }

  // Build human-readable Indonesian move log entry
  const dirLabel =
    toSide === 'right' ? 'ke Seberang Rumah' : 'kembali ke Tepi Awal';
  const passengerLabel = state.boatPassenger
    ? `Bawa ${ITEMS_META[state.boatPassenger].shortName} ${dirLabel}`
    : `Pak Tani mendayung sendirian ${dirLabel}`;

  const logEntry: MoveLogEntry = {
    step: nextMoves,
    from: fromSide,
    to: toSide,
    passenger: state.boatPassenger,
    text: `Langkah ${nextMoves}: ${passengerLabel}`,
  };

  const isVictory =
    conflict === 'none' &&
    toSide === 'right' &&
    nextRight.length === 3 &&
    nextLeft.length === 0 &&
    nextPassenger === null;

  return {
    leftBank: nextLeft,
    rightBank: nextRight,
    boatPassenger: nextPassenger,
    boatSide: toSide,
    moves: nextMoves,
    history: [...state.history, snapshot],
    moveLog: [...state.moveLog, logEntry],
    conflict,
    conflictBank,
    isVictory,
  };
}

/**
 * Restores the previous move snapshot before the last boat crossing.
 */
export function undoLastMove(state: GameState): GameState {
  if (state.history.length === 0) {
    return createInitialState();
  }
  const previous = state.history[state.history.length - 1];
  const remainingHistory = state.history.slice(0, -1);

  return {
    leftBank: [...previous.leftBank],
    rightBank: [...previous.rightBank],
    boatPassenger: previous.boatPassenger,
    boatSide: previous.boatSide,
    moves: previous.moves,
    history: remainingHistory,
    moveLog: [...previous.moveLog],
    conflict: 'none',
    conflictBank: null,
    isVictory: false,
  };
}

export function calculateStars(moves: number): 1 | 2 | 3 {
  if (moves <= 7) return 3;
  if (moves <= 9) return 2;
  return 1;
}

/**
 * Generates a contextual Socratic teacher hint based on the exact puzzle configuration.
 */
export function getSocraticHint(state: GameState): {
  title: string;
  message: string;
  keyInsight: string;
} {
  if (state.isVictory) {
    return {
      title: 'Teka-Teki Selesai!',
      message:
        'Hebat sekali! Sayur-Sayuran, Serigala, dan Kambing semuanya sudah sampai dengan aman di rumah Pak Tani.',
      keyInsight: 'Kamu telah menguasai algoritma penyeberangan sungai klasik!',
    };
  }

  if (state.conflict === 'wolf_eats_goat') {
    return {
      title: 'Kenapa Serigala Mengejar Kambing?',
      message:
        'Serigala dan Kambing tidak boleh ditinggal berdua tanpa pengawasan Pak Tani. Coba tekan "Mundur 1 Langkah" dan pilih penumpang lain!',
      keyInsight: 'Jangan tinggalkan Serigala + Kambing tanpa Pak Tani.',
    };
  }

  if (state.conflict === 'goat_eats_cabbage') {
    return {
      title: 'Kenapa Sayur-Sayuran Dimakan Kambing?',
      message:
        'Kambing sangat suka makan Sayur-Sayuran segar jika tidak dijaga Pak Tani. Tekan "Mundur 1 Langkah" dan pikirkan siapa yang aman ditinggal berdua!',
      keyInsight:
        'Serigala dan Sayur-Sayuran aman ditinggal berdua karena Serigala tidak makan sayur!',
    };
  }

  // Analyze current distribution (including boat passenger on current side)
  const leftSet = new Set(state.leftBank);
  const rightSet = new Set(state.rightBank);
  if (state.boatPassenger) {
    if (state.boatSide === 'left') leftSet.add(state.boatPassenger);
    else rightSet.add(state.boatPassenger);
  }

  // Case 1: Initial state (all 3 on left)
  if (leftSet.size === 3 && state.boatSide === 'left') {
    return {
      title: 'Petunjuk Langkah Pertama',
      message:
        'Coba perhatikan: siapa yang menjadi "pembuat masalah" di antara ketiganya? Kambing bisa dimakan Serigala, dan Kambing juga bisa memakan Sayur-Sayuran!',
      keyInsight:
        'Bawa 3. Kambing menyeberang lebih dulu supaya 1. Sayur-Sayuran dan 2. Serigala aman tinggal berdua di Tepi Awal.',
    };
  }

  // Case 2: Goat on right, Wolf & Cabbage on left, boat on right
  if (
    rightSet.size === 1 &&
    rightSet.has('goat') &&
    state.boatSide === 'right'
  ) {
    return {
      title: 'Kambing Sudah di Seberang!',
      message:
        'Sekarang Kambing aman sendirian di Seberang Rumah. Turunkan Kambing di dermaga seberang, lalu dayung perahu kosong kembali ke Tepi Awal!',
      keyInsight: 'Pastikan Kambing turun di Seberang sebelum Pak Tani kembali.',
    };
  }

  // Case 3: Goat on right, Wolf & Cabbage on left, boat on left
  if (
    rightSet.size === 1 &&
    rightSet.has('goat') &&
    state.boatSide === 'left'
  ) {
    return {
      title: 'Jemput Penumpang Kedua',
      message:
        'Di Tepi Awal ada Sayur-Sayuran dan Serigala. Kamu bebas memilih salah satu (misalnya 2. Serigala atau 1. Sayur-Sayuran) untuk dibawa ke Seberang Rumah!',
      keyInsight:
        'Pilih 2. Serigala atau 1. Sayur-Sayuran untuk naik ke perahu sekarang.',
    };
  }

  // Case 4: THE KEY TRICK! Goat + Wolf (or Goat + Cabbage) on right, boat on right
  if (
    rightSet.size === 2 &&
    rightSet.has('goat') &&
    state.boatSide === 'right'
  ) {
    return {
      title: 'Trik Rahasia Detektif Logika!',
      message:
        'Hati-hati! Kalau Pak Tani pulang sendirian sekarang, Kambing di seberang tidak aman. Ingat, bawaan yang sudah sampai di seberang BOLEH dibawa balik lagi ke perahu lho!',
      keyInsight:
        'Naikkan 3. Kambing kembali ke perahu dan bawa pulang ke Tepi Awal!',
    };
  }

  // Case 5: Wolf (or Cabbage) alone on right, Goat + other on left, boat on left
  if (
    rightSet.size === 1 &&
    !rightSet.has('goat') &&
    state.boatSide === 'left'
  ) {
    const remainingItem = leftSet.has('cabbage')
      ? '1. Sayur-Sayuran'
      : '2. Serigala';
    return {
      title: 'Tukar Penumpang di Tepi Awal!',
      message: `Jangan tinggalkan Kambing berdua di Tepi Awal! Turunkan Kambing di Tepi Awal, lalu angkut ${remainingItem} ke Seberang Rumah agar ditemani di sana.`,
      keyInsight:
        'Serigala dan Sayur-Sayuran akur bila ditinggal berdua di Seberang Rumah!',
    };
  }

  // Case 6: Wolf + Cabbage on right, Goat on left, boat on right
  if (
    rightSet.size === 2 &&
    rightSet.has('wolf') &&
    rightSet.has('cabbage') &&
    state.boatSide === 'right'
  ) {
    return {
      title: 'Serigala & Sayur-Sayuran Sudah Aman di Seberang!',
      message:
        'Lihat! Serigala dan Sayur-Sayuran aman ditinggal berdua di dekat rumah Pak Tani. Sekarang dayung perahu kosong kembali ke Tepi Awal untuk menjemput Kambing!',
      keyInsight:
        'Kosongkan perahu dan tekan "Dayung Perahu!" untuk menjemput Kambing.',
    };
  }

  // Case 7: Wolf + Cabbage on right, Goat on left, boat on left
  if (
    rightSet.size === 2 &&
    rightSet.has('wolf') &&
    rightSet.has('cabbage') &&
    state.boatSide === 'left'
  ) {
    return {
      title: 'Langkah Terakhir Menuju Kemenangan!',
      message:
        'Tinggal 3. Kambing sendirian di Tepi Awal! Naikkan Kambing ke perahu dan dayung menyeberang ke Rumah Pak Tani!',
      keyInsight: 'Klik 3. Kambing lalu klik "Dayung Perahu!" untuk menang!',
    };
  }

  return {
    title: 'Petunjuk Guru',
    message:
      'Ingat aturan utamanya: Serigala tidak boleh berdua dengan Kambing, dan Kambing tidak boleh berdua dengan Sayur-Sayuran tanpa Pak Tani.',
    keyInsight:
      'Gunakan tombol angka [1], [2], [3] dan [Spasi] untuk mencoba langkahmu!',
  };
}
