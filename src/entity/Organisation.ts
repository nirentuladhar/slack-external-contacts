import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  JoinTable,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm'
import { Contact } from './Contact'
import { ProgramArea } from './ProgramArea'

@Entity()
export class Organisation {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column({ nullable: true })
  abbreviation: string

  @Column({ nullable: true })
  notes: string

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date

  @ManyToMany((type) => Contact, (contact) => contact.organisations)
  contacts: Contact[]

  @Column({ nullable: true })
  previous_grants: string

  @Column({ nullable: true })
  grants_approved: string

  @Column({ nullable: true })
  grants_distributed: string

  @Column({ nullable: true })
  grants_in_process: string

  @Column({ nullable: true })
  future_grants_in_consideration: string

  @ManyToMany((type) => ProgramArea, (program) => program.organisations)
  @JoinTable()
  programs: ProgramArea[]
}
