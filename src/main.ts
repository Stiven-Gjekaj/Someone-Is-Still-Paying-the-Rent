import './styles.css'
import { renderAdvisory } from './advisory.ts'

const mount = document.getElementById('app')

if (mount === null) {
  throw new Error('#app is missing from index.html')
}

renderAdvisory(mount)
