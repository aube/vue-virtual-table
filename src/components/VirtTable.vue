<script setup lang="ts">
import { useInfiniteScroll } from "@vueuse/core";
import { ref, onMounted, useTemplateRef } from "vue";
import { VueDraggableNext } from "vue-draggable-next";
import { useApi } from "@/services/api";

type Item = {
  id: number;
  content: string;
  mark: boolean;
};
const { get, post, loading } = useApi();
const draggable = VueDraggableNext;
const el = useTemplateRef<HTMLElement>("el");
const data = ref<Item[]>([]);

const loadMore = async () => {
  // const length = data.value.length + 1;

  const response = await get<Item[]>("/items");
  if (response.error) {
    console.error(response.error);
    return;
  }

  response.data?.forEach(console.log);

  // data.value.concat(response.data);

  // data.value.push(
  //   ...Array.from({ length: 20 }, (_, i) => ({
  //     id: length + i,
  //     content: "0000" + (length + i),
  //     mark: false,
  //   })),
  // );
};

const { reset } = useInfiniteScroll(el, loadMore, {
  distance: 100,
  canLoadMore: () => !loading,
});

function resetList() {
  data.value = [];
  reset();
}

async function markItem(id: number) {
  const response = await post<undefined>("/items/" + String(id) + "/mark", {});
  if (response.error) {
    console.error(response.error);
  }
}

onMounted(() => {
  loadMore();
});
</script>

<template>
  loading {{ loading }}
  <div
    ref="el"
    class="flex flex-col gap-2 p-4 h-[620px] w-[320px] overflow-y-scroll bg-gray-500/5 rounded"
  >
    <draggable>
      <div
        v-for="item in data"
        :key="item.id"
        class="h-15 bg-gray-500/5 rounded p-3"
      >
        <input type="checkbox" v-model="item.mark" @click="markItem(item.id)" />
        {{ item.id }} {{ item.content }}
      </div>
    </draggable>
  </div>
  <button @click="resetList()">Reset</button>
</template>
