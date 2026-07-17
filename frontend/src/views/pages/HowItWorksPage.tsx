import React from 'react';

const HowItWorksPage: React.FC = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto text-gray-100">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          How Keeper Works
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Behind the scenes, Keeper uses a 700-year-old mathematical principle called Double-Entry Bookkeeping to ensure your money is tracked flawlessly.
        </p>
      </header>

      <section className="mb-16 bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-4 text-blue-400">The Core Principle: Zero-Sum</h2>
            <p className="text-gray-300 text-lg mb-4 leading-relaxed">
              In traditional budget apps, when you spend money, it simply "disappears" from your balance. 
              In Keeper, <strong>money never disappears, it only moves.</strong>
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              Every transaction you make is actually recorded as a transfer between two accounts. If you buy a $5 coffee, Keeper deducts $5 from your <em>Checking Account</em> (a Credit) and adds $5 to your <em>Coffee Expense Account</em> (a Debit).
            </p>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden shadow-lg border border-gray-600 bg-gray-900 p-2">
            <img 
              src="/double_entry_flow_1784611164455.jpg" 
              alt="Double Entry Flow showing money moving seamlessly from Debit to Credit" 
              className="w-full h-auto object-cover rounded-lg"
            />
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-8 text-center text-purple-400">How we handle your scenarios natively</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ScenarioCard 
            title="1. Standard Transfer" 
            desc="Moving money from Savings to Checking? We just deduct from one asset and add to the other."
            split1="- $100 Savings"
            split2="+ $100 Checking"
            icon="🔄"
          />
          <ScenarioCard 
            title="2. Settling Credit Cards" 
            desc="Paying off your bill? We move money from your Checking (Asset) into your Credit Card (Liability) to bring the bill down to zero."
            split1="- $500 Checking"
            split2="+ $500 Credit Card"
            icon="💳"
          />
          <ScenarioCard 
            title="3. Lending to a Friend" 
            desc="You loan Bob $50. We create an Asset account called 'Loan: Bob'. Money moves from your checking to his loan account."
            split1="- $50 Checking"
            split2="+ $50 Loan: Bob"
            icon="🤝"
          />
          <ScenarioCard 
            title="4. Getting Repaid" 
            desc="Bob pays you back. We simply reverse the flow, bringing his loan balance back to zero."
            split1="- $50 Loan: Bob"
            split2="+ $50 Checking"
            icon="✅"
          />
          <ScenarioCard 
            title="5. Earning Salary" 
            desc="Where does money come from? It flows from an 'External Income' account into your checking."
            split1="- $5000 Income:Salary"
            split2="+ $5000 Checking"
            icon="💰"
          />
          <ScenarioCard 
            title="6. Cash Wallet" 
            desc="Withdrawing from an ATM? We move it from Checking to a dedicated Cash Asset account."
            split1="- $200 Checking"
            split2="+ $200 Cash Wallet"
            icon="💵"
          />
        </div>
      </section>
      
      <section className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-2xl p-8 text-center shadow-2xl border border-purple-500/30">
        <h2 className="text-3xl font-bold mb-4 text-white">But you don't have to worry about this!</h2>
        <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
          While the backend ensures mathematical perfection using this powerful ledger, the UI uses simple <strong>Transaction Templates</strong>. You just tell us "I'm settling my credit card", and we handle the double-entry splits for you automatically.
        </p>
      </section>
    </div>
  );
};

const ScenarioCard = ({ title, desc, split1, split2, icon }: { title: string, desc: string, split1: string, split2: string, icon: string }) => (
  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-colors shadow-lg">
    <div className="flex items-center gap-3 mb-3">
      <span className="text-3xl">{icon}</span>
      <h3 className="text-xl font-bold text-gray-100">{title}</h3>
    </div>
    <p className="text-gray-400 mb-6 min-h-[48px]">{desc}</p>
    
    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm border border-gray-700">
      <div className="flex justify-between text-red-400 mb-2">
        <span>{split1}</span>
        <span>Credit</span>
      </div>
      <div className="flex justify-between text-green-400">
        <span>{split2}</span>
        <span>Debit</span>
      </div>
    </div>
  </div>
);

export default HowItWorksPage;
