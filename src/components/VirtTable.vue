<script setup lang="ts">
import { useInfiniteScroll } from "@vueuse/core";
import { ref, nextTick, onMounted, useTemplateRef } from "vue";
import { useSortable } from "@vueuse/integrations/useSortable";
import { useApi } from "@/services/api";

type Item = {
  id: number;
  content: string;
  mark: boolean;
};

type ItemsResp = {
  items: Item[];
  length: number;
  lastindex?: number;
};

const SIZE = 20;
const { get, post, loading } = useApi();
const el = useTemplateRef<HTMLElement>("el");
const data = ref<Item[]>([]);
const filter = ref("");

let page = 1;
let lastindex = 0;

const loadItemsFiltered = async () => {
  const response = await get<ItemsResp>(
    "/items/" + filter.value + "?size=" + SIZE + "&lastindex=" + lastindex,
  );
  if (response.error) {
    console.error(response.error);
    return;
  }
  data.value.push(...(response.data?.items || []).filter((i) => i));
  lastindex = response.data?.lastindex || 0;
};

const loadItems = async () => {
  const response = await get<ItemsResp>(
    "/items?size=" + SIZE + "&page=" + page,
  );
  if (response.error) {
    console.error(response.error);
    return;
  }
  data.value.push(...(response.data?.items || []).filter((i) => i));
  page++;
};

const loadMore = async () => {
  if (!canLoadMore()) return;

  if (filter.value) {
    await loadItemsFiltered();
  } else {
    await loadItems();
  }
};

const canLoadMore = () => {
  return !loading.value;
};

useInfiniteScroll(el, loadMore, {
  distance: 100,
  canLoadMore,
});

async function markItem(id: number) {
  const response = await post<undefined>("/items/" + String(id) + "/mark", {});
  if (response.error) {
    console.error(response.error);
  }
}

async function filterItems() {
  page = 1;
  lastindex = 0;
  data.value = [];
  loadMore();
}

interface draggableResult {
  oldIndex: number;
  newIndex: number;
}

async function moveItem(result: draggableResult) {
  const { oldIndex: from, newIndex: to } = result;
  const movedItem = data.value[from];

  const response = await post<undefined>(
    "/items/" + String(movedItem.id) + "/sort",
    { shift: to - from },
  );

  if (response.error) {
    console.error(response.error);
    return;
  }

  if (from < to) {
    for (let n = from; n < to; n++) {
      data.value[n] = data.value[n + 1];
    }
  } else if (from > to) {
    for (let n = from; n > to; n--) {
      data.value[n] = data.value[n - 1];
    }
  }

  data.value[to] = movedItem;
  await nextTick();
}

useSortable(el, data, {
  animation: 150,
  onUpdate: moveItem,
});

onMounted(() => {
  loadMore();
});
</script>

<template>
  <div class="!mb-3">
    <input
      v-model="filter"
      placeholder="filter"
      class="bg-gray-500/5 rounded p-2"
      @input="filterItems"
    />
  </div>

  <div
    ref="el"
    class="flex flex-col gap-2 p-2 h-[80vh] w-[320px] overflow-y-auto bg-gray-500/5 rounded"
  >
    <div
      v-for="item in data"
      :key="item.id"
      class="h-15 bg-gray-500/5 rounded p-3 flex items-center gap-3"
    >
      <input type="checkbox" v-model="item.mark" @click="markItem(item.id)" />
      <span>
        {{ item.content }}
      </span>
    </div>
  </div>
</template>
