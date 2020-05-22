<template>
  <tr class="qso">
    <td>{{ index }}</td>
    <td v-for="key in qsoKeys" :key="key">
      <span v-if="!editing || key === 'timestamp'">
        {{ formatCol(key) }}
      </span>
      <input
        @keyup.enter="endEdit(true)"
        v-else
        v-model="editedQSO[key]"
        size="10"
      />
    </td>
    <td>
      <span v-if="!editing">
        <button class="icon edit" title="Edit" @click="beginEdit">
          &#9998;
        </button>
        <button class="icon delete" title="Delete" @click="deleteQSO">
          &#x1f5d1;
        </button>
      </span>
      <span v-else>
        <button class="icon confirm" title="Save Edit" @click="endEdit(true)">
          &#10003;
        </button>
        <button class="icon cancel" title="Cancel Edit" @click="endEdit(false)">
          &#10008;
        </button>
      </span>
    </td>
  </tr>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

import { HumanReadableQSO, IHumanReadableQSO } from './QSO';

/**
 * A single entry in a {@link QSOLog} table
 */
@Component
export default class QSOLogRow extends Vue {
  readonly headers = HumanReadableQSO.headers;
  @Prop({ required: true }) qso!: Readonly<HumanReadableQSO>;
  @Prop({ required: true }) index!: Readonly<number>;

  editedQSO: HumanReadableQSO | null = null;
  editing = false;

  /**
   * A helper function to get the keys of {@link HumanReadableQSO} as the correct type
   */
  get qsoKeys(): (keyof IHumanReadableQSO)[] {
    return Object.keys(this.headers) as (keyof IHumanReadableQSO)[];
  }

  /**
   * Applies any special formatting needed for properties of a QSO
   * @param key - the name of the property to format
   * @returns the formatted string
   */
  formatCol(key: keyof IHumanReadableQSO): string {
    const value = this.qso[key];
    if (value instanceof Date) {
      return value.toISOString();
    } else {
      return value;
    }
  }

  /**
   * Confirm deletion, then delete this QSO
   */
  deleteQSO() {
    const result = window.confirm('Are you sure you want tot delete this QSO?');
    if (result) {
      this.qso.document.remove();
    }
  }

  /**
   * Enter editing mode
   */
  beginEdit() {
    this.editing = true;
    this.editedQSO = new HumanReadableQSO(this.qso);
  }

  /**
   * Exit editing mode, optionally writing the modifications
   * @param save - should the changes be saved?
   */
  endEdit(save: boolean) {
    if (save) {
      this.qso.document.update({
        $set: this.editedQSO.asQSO(),
      });
    }
    this.editedQSO = null;
    this.editing = false;
  }
}
</script>
<style lang="scss">
.icon {
  width: 2em;
  padding: 0em;

  &.edit {
    /* mirror glyph to look more like normal edit button */
    transform: scale(-1, 1);
  }
}
</style>
