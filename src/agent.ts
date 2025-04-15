import { errAsync, fromPromise, okAsync, type ResultAsync } from 'neverthrow'
import { executeAction } from './utils/agent/action-executor' // Import executor
import { determineNextAction } from './utils/agent/controller-llm' // Import controller
import {
  type Character,
  fetchCharacterByName,
  updateCharacterState, // Import updateCharacterState
} from './utils/character'

interface AgentResponse {
  responseText: string
  updatedCharacter: Character // Or just the updated fields
}

export function processUserMessage(
  userId: string,
  userMessage: string,
): ResultAsync<AgentResponse, Error> {
  // 1. Fetch current character state
  return (
    fromPromise(fetchCharacterByName('トロ'), (e) =>
      e instanceof Error ? e : new Error(String(e)),
    )
      .andThen((character) => {
        if (!character) {
          return errAsync(new Error('Character not found: トロ'))
        }
        return okAsync(character)
      })
      // 2. Determine next action using Controller LLM
      .andThen((character) =>
        determineNextAction(character, userMessage /*, history */).map(
          (action) => ({ character, action }), // Pass character and action to the next step
        ),
      )
      // 3. Execute the action
      .andThen(({ character, action }) =>
        executeAction(action, character, userMessage).map((result) => ({
          character,
          result, // Pass character and execution result
        })),
      )
      // 4. Update character state in DB (if necessary)
      .andThen(({ character, result }) => {
        if (Object.keys(result.stateChanges).length > 0) {
          // Only update if there are changes
          return fromPromise(
            updateCharacterState(character.id, result.stateChanges),
            (e) => (e instanceof Error ? e : new Error(String(e))),
          ).map((updatedChar) => ({
            responseText: result.responseText,
            // Use updated character if update was successful, otherwise fallback?
            updatedCharacter: updatedChar || character, // Decide fallback strategy
          }))
        }
        // No state changes, just pass through
        return okAsync({
          responseText: result.responseText,
          updatedCharacter: character,
        })
      })
  )
  // 5. Return final response (already mapped in step 4)
}

// Removed custom fromPromise helper, will use the one from neverthrow directly
