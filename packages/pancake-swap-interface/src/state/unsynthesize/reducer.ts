import {createReducer} from '@reduxjs/toolkit'
import {resetState, typeInput} from './actions'

export interface UnsynthesizeState {
  readonly value: string
}

const initialState: UnsynthesizeState = {
  value: ''
}

export default createReducer<UnsynthesizeState>(initialState, builder =>
    builder
        .addCase(resetState, () => initialState)
        .addCase(typeInput, (state, {payload: {value}}) => {
          return {...state, value}
        })
)
