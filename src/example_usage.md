// Example usage in a Next.js app:
// app/state.ts
export const {
Provider,
useNextState,
createNextAction,
withNextServer
} = createNextState({
initialState: {
user: null,
theme: 'light',
todos: []
},
options: {
persist: true,
key: 'app-state'
}
});

// Follows Next.js patterns for actions
export const useTodoActions = createNextAction((title: string) => (state) => ({
todos: [...state.todos, { id: Date.now().toString(), title, completed: false }]
}));

// Server action pattern similar to Next.js
export const fetchTodos = withNextServer(async () => {
const response = await fetch('/api/todos');
return response.json();
});

// app/layout.tsx
import { Provider } from './state';

export default function RootLayout({ children }) {
return (
<Provider>
{children}
</Provider>
);
}

// app/components/TodoList.tsx
function TodoList() {
// Feels like using Next.js hooks
const todos = useNextState(state => state.todos);
const addTodo = useTodoActions();

return (
<div className="space-y-4">
{todos.map(todo => (
<div key={todo.id} className="flex items-center gap-2">
<input
            type="checkbox"
            checked={todo.completed}
            className="form-checkbox h-5 w-5"
          />
<span>{todo.title}</span>
</div>
))}
<button
onClick={() => addTodo('New Todo')}
className="px-4 py-2 bg-blue-500 text-white rounded-md" >
Add Todo
</button>
</div>
);
}
