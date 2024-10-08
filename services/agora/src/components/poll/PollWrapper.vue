<template>
  <div>
    <div>
      <div v-if="showResults" class="pollContainer">

        <div class="pollOptionList">
          <option-view v-for="optionItem in localPollOptions" :key="optionItem.index" :option="optionItem.option"
            :option-responded="localUserVote.voteIndex == optionItem.index && localUserVote.hasVoted"
            :option-percentage="totalCount === 0 ? 0 : Math.round((optionItem.numResponses * 100) / totalCount)" />
        </div>

        <div class="voteCounter">
          {{ totalCount }} vote<span v-if="totalCount > 1">s</span>
        </div>

        <div>
          <ZKButton v-if="!localUserVote.hasVoted" outline text-color="primary" label="Cast Vote" icon="mdi-vote"
            @click.stop.prevent="castVoteRequested()" />
        </div>
      </div>


    </div>

    <div v-if="!showResults" class="pollContainer">

      <div class="pollOptionList">
        <ZKButton v-for="optionItem in localPollOptions" :key="optionItem.index" outline :label="optionItem.option"
          text-color="primary" @click.stop.prevent="voteCasted(optionItem.index)" />
      </div>

      <div class="actionButtonCluster">
        <ZKButton outline text-color="primary" icon="mdi-chart-bar" label="Results"
          @click.stop.prevent="showPollResults()" />
      </div>

    </div>

  </div>

</template>

<script setup lang="ts">
import OptionView from "components/poll/OptionView.vue";
import ZKButton from "../ui-library/ZKButton.vue";
import { DummyPollOptionFormat, DummyPostUserVote } from "src/stores/post";
import { ref, toRaw } from "vue";

const props = defineProps<{
  pollOptions: DummyPollOptionFormat[];
  userVote: DummyPostUserVote;
}>();

const localPollOptions = structuredClone(toRaw(props.pollOptions));
const localUserVote = structuredClone(toRaw(props.userVote));
const showResults = ref(localUserVote.hasVoted);

let totalCount = 0;
props.pollOptions.forEach(option => {
  totalCount += option.numResponses;
});

function castVoteRequested() {
  showResults.value = false;
}

function showPollResults() {
  showResults.value = true;
}

function voteCasted(selectedIndex: number) {
  localPollOptions[selectedIndex].numResponses += 1;
  localUserVote.voteIndex = selectedIndex;

  localUserVote.hasVoted = true;
  showResults.value = true;
}

</script>

<style scoped>
.pollOptionList {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.actionButtonCluster {
  display: flex;
  gap: 1rem;
}

.pollContainer {
  background-color: white;
  padding: 1rem;
  border-radius: 15px;
  border-style: solid;
  border-color: #d1d5db;
  border-width: 1px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.voteCounter {
  color: #737373;
}
</style>
