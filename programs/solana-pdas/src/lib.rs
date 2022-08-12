use anchor_lang::prelude::*;

declare_id!("4ceG76xQbYtpDb2zPc7usRrgKBzYbtTJedGrtZXRcGzm");

#[program]
pub mod solana_pdas {
    use super::*;

    pub fn create_ledger(ctx: Context<CreateLedger>, color: String) -> Result<()> {

        let ledger_account = &mut ctx.accounts.ledger_account;
        ledger_account.color = color;
        ledger_account.balance = 0;
        Ok(())
    }

    pub fn modify_ledger(ctx: Context<ModifyLedger>, new_balance: u32) -> Result<()> {

        let ledger_account = &mut ctx.accounts.ledger_account;
        ledger_account.balance = new_balance;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(color: String)] // This is telling Anchor to expect color arg from instruction fn call
pub struct CreateLedger<'info> {
    #[account(init, payer = wallet, space = 25, seeds = [wallet.key().as_ref(), b"_", color.as_ref()], bump )]
    pub ledger_account: Account<'info, Ledger>,
    #[account(mut)]
    pub wallet: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ModifyLedger<'info> {
    // NOTE Anchor will check that this ledger_account has ALREADY been created (CheckedAccount??)
    // Q: Is this why in some other projects we use UncheckedAccount as the type?
    // For example, in MintNft struct, we have:
    // ==
    // #[account(mut)]
    // pub token_account = UncheckedAccount<'info>
    // ==
    // since Anchor will eventually create and initialize the token_account.
    #[account(mut)]
    pub ledger_account: Account<'info, Ledger>,
    #[account(mut)]
    pub wallet: Signer<'info>,
}

#[account]
pub struct Ledger {
    pub color: String,
    pub balance: u32,
}
