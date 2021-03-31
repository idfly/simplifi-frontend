import {createReducer} from '@reduxjs/toolkit'
import {resetState, typeInput} from './actions'

export interface SynthesizeState {
  readonly value: string
}

const initialState: SynthesizeState = {
  value: ''
}

export default createReducer<SynthesizeState>(initialState, builder =>
    builder
        .addCase(resetState, () => initialState)
        .addCase(typeInput, (state, {payload: {value}}) => {
          return {...state, value}
        })
)
