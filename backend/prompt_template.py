
# ============================================================================
# Chainable PromptTemplate Class
# ============================================================================

from typing import List, Dict, Any, Self

class PromptTemplate:
    """
    A chainable prompt template class.
    
    Each method returns a new PromptTemplate instance, allowing fluent
    method chaining to build complex prompts incrementally.
    """
    
    def __init__(self, template: str, **kwargs):
        """
        Initialize the template.
        
        Args:
            template: The base prompt text (can include {placeholders})
            **kwargs: Default values for placeholders
        """
        self.template = template
        self.default_params = kwargs
    
    
    def with_role(self, role: str) -> 'PromptTemplate':
        """
        Add a role/persona to the prompt.
        
        Args:
            role: Description of the role (e.g., "a physics professor")
            
        Returns:
            A new PromptTemplate with the role prepended
        """
        self.template = f"You are {role}.\n\n{self.template}"
        return self
    
    def with_output_format(self, format_spec: str) -> 'PromptTemplate':
        """
        Specify the desired output format.
        
        Args:
            format_spec: Description of expected output format
            
        Returns:
            A new PromptTemplate with format instructions appended
        """
        self.template = f"{self.template}\n\nProvide your response in the following format:\n{format_spec}"
        return self
    
    def with_context(self, context: str) -> 'PromptTemplate':
        """
        Add contextual information to the prompt.
        
        Args:
            context: Background information or context
            
        Returns:
            A new PromptTemplate with context added
        """
        self.template = f"Context: {context}\n\n{self.template}"
        return self
    
    def with_constraints(self, constraints: List[str]) -> 'PromptTemplate':
        """
        Add constraints to the prompt.
        
        Args:
            constraints: List of constraints to follow
            
        Returns:
            A new PromptTemplate with constraints appended
        """
        constraints_text = "\n".join([f"- {c}" for c in constraints])
        self.template = f"{self.template}\n\nConstraints:\n{constraints_text}"
        return self
    
    def with_examples(self, examples: List[Dict[str, str]]) -> 'PromptTemplate':
        """
        Add few-shot examples to the prompt.
        
        Args:
            examples: List of dicts with 'input' and 'output' keys
            
        Returns:
            A new PromptTemplate with examples inserted
        """
        examples_text = "\n\n".join([
            f"Example {i+1}:\nInput: {ex['input']}\nOutput: {ex['output']}"
            for i, ex in enumerate(examples)
        ])
        self.template = f"Examples:\n{examples_text}\n\n{self.template}"
        return self
    
    def with_chain_of_thought(self) -> 'PromptTemplate':
        """
        Add chain-of-thought instruction.
        
        Returns:
            A new PromptTemplate with step-by-step reasoning instruction
        """
        self.template = f"{self.template}\n\nThink through this step-by-step and show your reasoning."
        return self
    

    def full_prompt(self, **kwargs) -> str:
        """
        Format the template with provided parameters.
        
        Args:
            **kwargs: Values to fill in placeholders
            
        Returns:
            The formatted prompt string
        """
        params = {**self.default_params, **kwargs}
        return self.template.format(**params)
    

    def generate(self, client, model, **kwargs) -> str:
        """
        Use Google genai client to generate response from an input prompt
        """
        full_prompt = self.full_prompt(**kwargs)
        response = client.models.generate_content(model = model, contents = full_prompt)
        return response.text
    
    def __str__(self) -> str:
        """Return the current template string."""
        return self.template
    
    def __repr__(self) -> str:
        """Return a detailed representation."""
        return f"PromptTemplate(template={self.template[:50]}..., params={self.default_params})"


class DataExtractionTemplate(PromptTemplate):
    def structured_decomposition(self, steps: List[str]) -> Self:
        if not steps:
            return self

        decomposition_header = "\n\n### Required Execution Steps:"
        steps_text = "\n".join([f"{i+1}. {step}" for i, step in enumerate(steps)])
        self.template = f"{self.template}{decomposition_header}\n{steps_text}"
        return self

    def constraint_scaffolding(self, rules: List[str]) -> Self:
        if not rules:
            return self

        scaffolding_header = "\n\n### Strict Output Constraints:"
        rules_text = "\n".join([f"* {rule}" for rule in rules])
        self.template = f"{self.template}{scaffolding_header}\n{rules_text}"
        return self