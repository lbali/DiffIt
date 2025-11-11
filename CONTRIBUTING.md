# Contributing to Diff It!

Thank you for considering contributing to Diff It! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- A clear title and description
- Steps to reproduce the issue
- Expected vs actual behavior
- MySQL/MariaDB version and schema details (if relevant)
- Screenshots (if applicable)

### Suggesting Features

Feature suggestions are welcome! Please create an issue with:
- Clear description of the feature
- Use case and benefits
- Any implementation ideas

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update TypeScript types as needed

4. **Test your changes**
   ```bash
   # Backend
   cd backend
   npm run lint
   npm run format
   npx tsc --noEmit
   
   # Frontend
   cd frontend
   npm run lint
   npm run format
   npx tsc --noEmit
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: add awesome feature"
   ```
   
   Use conventional commit messages:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc)
   - `refactor:` - Code refactoring
   - `test:` - Adding tests
   - `chore:` - Maintenance tasks

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Provide a clear description
   - Reference any related issues
   - Include screenshots for UI changes

## Development Setup

See README.md for full setup instructions.

## Code Style

- Use TypeScript for type safety
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Use meaningful variable and function names
- Keep functions small and focused

## Testing

While we don't have comprehensive tests yet, please:
- Manually test your changes thoroughly
- Test with different MySQL/MariaDB versions if possible
- Verify generated SQL is valid

## Questions?

Feel free to open an issue for any questions about contributing!
