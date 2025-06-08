<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useInfiniteScroll } from "@vueuse/core";
import { useSortable } from "@vueuse/integrations/useSortable";
import { useApi } from "@/services/api";

// Types
interface Item {
  id: number;
  content: string;
  mark: boolean;
  decoratedContent?: {
    zeroes: string;
    num: string;
  };
}

interface ItemsResponse {
  items: Item[];
  length: number;
  page?: number;
  size?: number;
  lastEntry?: number;
  firstEntry?: number;
}

interface DraggableResult {
  oldIndex: number;
  newIndex: number;
}

// Constants
const PAGE_SIZE = 20;

// Composables
const { get, post, put, loading } = useApi();

// Refs
const itemsListContainer = ref<HTMLElement>();
const items = ref<Item[]>([]);
const filter = ref("");
const currentPage = ref(1);
const lastEntryIdx = ref(0);
const firstEntryIdx = ref(0);

// Data fetching functions
const fetchItems = async (isFilterUpdate: boolean = false) => {
  if (filter.value) {
    await fetchFilteredItems(isFilterUpdate);
  } else {
    await fetchPaginatedItems();
  }
};

const fetchPaginatedItems = async () => {
  const response = await get<ItemsResponse>(
    `/items?size=${PAGE_SIZE}&page=${currentPage.value}`,
  );

  if (response.error) {
    console.error("Error fetching items:", response.error);
    return;
  }

  appendItems(response.data?.items || []);
  currentPage.value++;
};

const fetchFilteredItems = async (isFilterUpdate: boolean) => {
  const fromId = isFilterUpdate ? firstEntryIdx.value : lastEntryIdx.value;
  const response = await get<ItemsResponse>(
    `/items/?size=${PAGE_SIZE}&from=${fromId}&filter=${filter.value}`,
  );

  if (response.error) {
    console.error("Error fetching filtered items:", response.error);
    return;
  }

  const newItems = response.data?.items || [];
  appendItems(newItems);

  if (isFilterUpdate) {
    firstEntryIdx.value = response.data?.firstEntry || 0;
  }
  lastEntryIdx.value = response.data?.lastEntry || 0;
};

const itemContentDecoration = (item: Item) => {
  const rexp = new RegExp(/^(0+)(.+)/g);
  const matches = [...item.content.matchAll(rexp)];
  return {
    ...item,
    decoratedContent: {
      zeroes: matches[0][1],
      num: matches[0][2],
    },
  };
};

const appendItems = (newItems: Item[]) => {
  items.value.push(...newItems.filter(Boolean).map(itemContentDecoration));
};

// Item actions
const markItem = async (id: number) => {
  const response = await post<undefined>(`/items/${id}/mark`, {});
  if (response.error) {
    console.error("Error marking item:", response.error);
  }
};

const init = async () => {
  await fetchItems();
};

const resetAll = async () => {
  const response = await put<undefined>(`/items`, []);

  if (response?.error) {
    console.error("Error fetching filtered items:", response.error);
    return;
  }

  filter.value = "";
  currentPage.value = 1;
  lastEntryIdx.value = 0;
  firstEntryIdx.value = 0;
  items.value = [];

  init();
};

const moveItem = async ({ oldIndex, newIndex }: DraggableResult) => {
  if (oldIndex === newIndex) return;

  const movedItem = items.value[oldIndex];
  let requestData = null;

  // Update local array
  if (oldIndex < newIndex) {
    for (let i = oldIndex; i < newIndex; i++) {
      items.value[i] = items.value[i + 1];
    }
    requestData = { after: items.value[newIndex - 1].id };
  } else {
    for (let i = oldIndex; i > newIndex; i--) {
      items.value[i] = items.value[i - 1];
    }
    requestData = { before: items.value[newIndex + 1].id };
  }

  items.value[newIndex] = movedItem;

  // Send API request
  if (requestData) {
    const response = await post<undefined>(
      `/items/${movedItem.id}/sort`,
      requestData,
    );

    if (response.error) {
      console.error("Error moving item:", response.error);
    }
  }
};

// Infinite scroll setup
const canLoadMore = () => !loading.value;

useInfiniteScroll(itemsListContainer, () => fetchItems(false), {
  distance: 0,
  canLoadMore,
});

// Sortable setup
useSortable(itemsListContainer, items, {
  animation: 150,
  onUpdate: moveItem,
});

// Watchers
watch(filter, (newValue, oldValue) => {
  currentPage.value = 1;
  items.value = [];

  if (!newValue) {
    fetchItems();
    return;
  }

  if (!newValue.startsWith(oldValue)) {
    lastEntryIdx.value = 0;
    firstEntryIdx.value = 0;
  }

  fetchItems(true);
});

onMounted(async () => {
  init();
});
</script>

<template>
  <div class="!mb-3 w-[320px]">
    <input
      v-model="filter"
      placeholder="Filter items..."
      class="bg-gray-500/5 rounded p-2 w-full"
    />
  </div>

  <div
    ref="itemsListContainer"
    class="gap-2 p-2 h-[80vh] w-[320px] overflow-y-auto bg-gray-500/5 rounded"
    style="max-height: calc(var(--spacing) * 15 * 19)"
  >
    <div
      v-for="item in items"
      :key="item.id"
      class="h-15 rounded p-3 flex items-center gap-3"
    >
      <input
        type="checkbox"
        v-model="item.mark"
        @click="markItem(item.id)"
        class="cursor-pointer"
      />
      <span v-if="item.decoratedContent" class="flex-grow">
        <span class="opacity-50">{{ item.decoratedContent.zeroes }}</span>
        <span class="font-black">{{ item.decoratedContent.num }}</span>
      </span>
      <span v-else class="flex-grow">
        {{ item.content }}
      </span>
    </div>
  </div>

  <button
    type="button"
    class="!mt-3 text-xs py-2.5 px-5 me-2 mb-2 font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
    @click="resetAll"
  >
    resetAll
  </button>
</template>
